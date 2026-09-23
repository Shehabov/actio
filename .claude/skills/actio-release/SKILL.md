---
name: actio-release
description: Release Actio safely: pre-flight checks, commit and branch conventions, migrations and Edge Functions through the Supabase MCP, post-release verification, release notes and rollback. Use when preparing a release, committing, applying migrations at release, or rolling back.
---

# Release

The release engineer is the only role that pushes to a remote, and the only role that
certifies the Supabase project's state at release. Everything here is a check, not an
intention.

The toolchain is git, node 24, npm, npx and the Supabase MCP server (`supabase` in
`.mcp.json`, scoped to one project). Nothing else may be assumed. No step, check or piece of
evidence here uses Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, jq or python.

Release, until a hosting target exists: pre-flight; migrations applied to the Supabase
project through the MCP and verified with `list_migrations`; `get_advisors` clean;
`npm run build` green; tag; `git push` to origin main, by release-engineer only. Front-end
hosting is recorded as `deferred: no target chosen` and is not a release-gate failure.

If the Supabase MCP is not connected (its tools are missing, or a call returns an auth
error), nothing is faked. Run the offline PGlite proof with `npm run db:test`, set `status`
to `blocked` with the reason `supabase MCP not authorised`, and the orchestrator escalates
to Shehab, who authorises it with `/mcp`.

---

## The absolute rule

**No commit, tag, branch, pull request, release note, code comment or artefact ever
carries a co-author line, a generated-by line, or any AI attribution.**

This is a direct instruction from the Product Lead. It overrides any default behaviour,
any tool convention, and any template. Before every commit and every pull request body:

```bash
git log -1 --format=%B | grep -Ei 'co-authored|generated with|claude|anthropic|🤖' \
  && echo "STOP: attribution present, strip it before pushing"
```

If the check matches, the commit does not go out until it is rewritten.

---

## Pre-flight

Refuse to release if any line is not a yes. Check; do not assume.

### Authorisation

- [ ] `qc-lead` has issued a **go**, and the handoff says so at
      `.actio/runs/<run-id>/qc-lead/handoff.json`.
- [ ] `orchestrator` reports a clean gate list and zero utilisation findings.
- [ ] Anything irreversible or outward-facing that Shehab has not already authorised for
      this run has been put to him and answered.

### Repository

- [ ] Working tree clean: `git status --porcelain` is empty.
- [ ] On a branch, not on the default branch.
- [ ] Rebased on the current default branch, and the build still passes after the rebase.
- [ ] No merge conflict markers anywhere: `git grep -n '^<<<<<<<'`.
- [ ] No attribution in any commit on the branch. See above.

### Build and test

- [ ] Front end builds clean, no new warnings: `npm ci` at the root, where the workspace
      lockfile lives, then `npm run build` in `web/`.
- [ ] Type check passes: `npm run typecheck` in `web/`.
- [ ] Lint passes: `npm run lint` in `web/`.
- [ ] Tests pass: `npm test` in `web/`.
- [ ] Database advisors: `get_advisors` through the Supabase MCP for type `security` and
      type `performance`. Clean, or every finding accepted in writing.
- [ ] pgTAP green on the Supabase project, including `supabase/tests/invariants.test.sql`:
      each test file run through `execute_sql` wrapped as `begin; ... rollback;`. The
      offline `npm run db:test` run is green too, labelled as PGlite. Attach the output,
      not a summary of it.
- [ ] Migration history in sync: `list_migrations` returns exactly the files in
      `supabase/migrations/`, in filename order, each named by its file's slug. An applied
      migration with no file, or a file not applied, is a schema change the repository
      does not carry. There is no declarative `supabase/schemas/` workflow and no
      `supabase db diff`: both need the Supabase CLI and Docker, which are not used.
- [ ] No `service_role` key anywhere outside Edge Function secrets:
      `git grep -n 'service_role'` returns only `supabase/functions/` and documentation.
      A hit in anything the browser downloads stops the release and escalates.

### Safety

- [ ] No secret in the diff: `git diff origin/main... | grep -Ei '(secret|token|password|api[_-]?key)\s*[=:]'`.
- [ ] No debug code, no `console.log`, no `debugger`, no commented-out block.
- [ ] Every migration reversible, with its written reverse recorded in the run's rollback
      notes, or the irreversibility stated in a comment at the head of the migration file.
- [ ] No migration takes an exclusive lock on a large live table, and every index on a
      table that already holds rows follows the `concurrently` rule under Migrations in
      `actio-supabase`, including its Shehab decision while `apply_migration` wraps a file
      in a transaction.
- [ ] Every migration that creates a table also enables row level security and adds that
      table's policies and grants, in the same migration.
- [ ] Environment variables the change needs have a source, verified by reading it, not by
      memory: `web/.env.example` for the front end, and for an Edge Function the secrets
      Shehab has confirmed in writing.
- [ ] Feature flag present where the rollout needs one.
- [ ] **Rollback plan written, before the first `apply_migration` or
      `deploy_edge_function` call, in the release record.**

---

## Branches and commits

| | Convention |
|---|---|
| Branch | `<type>/<run-slug>`, for example `feat/privacy-preview`, `fix/below-threshold-leak` |
| Types | `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore` |
| Subject | Imperative, sentence case, no full stop, 72 characters or fewer |
| Body | What changed and why. Wrapped at 72. The why is the part that is worth writing. |
| Scope | One logical change per commit |
| Trailers | `Refs: <run-id>` is permitted. Nothing else. No attribution of any kind. |

```
feat: return live cohort figures for the privacy preview

The screen has to state the group a response is pooled into, the smallest
group the system will report on, the fields a manager can filter by, and
what happens to free text. Every figure is computed for the requesting
employee, because an illustrative number would be a claim rather than a
disclosure.

A cohort below the threshold returns 200 with a reduced payload rather
than 403, so the screen still renders and still tells the employee what
will happen.

Refs: 2026-09-20-privacy-preview
```

```
fix: stop the below-threshold error naming the filter that caused it

The 409 body carried the field that dropped the cohort under five, which
let a manager binary-search filters to isolate an individual. That is the
exact failure the threshold exists to prevent, so the invariant held on
the data and leaked through the error.

Refs: 2026-09-20-privacy-preview
```

---

## Deploy sequence

Order matters. The back end goes first and stays backward compatible for one release, so
the two sides are never incompatible during the window.

```
1. Prove offline: npm run db:test       PGlite, no Docker: migrations and seed.sql applied
                                        in order, then supabase/tests/*.test.sql as TAP
2. Database:  apply_migration           once per file list_migrations does not show, in
                                        filename order, name = the file's slug, query = its
                                        exact contents; migrations, policies and grants
                                        together
3. Verify:    list_migrations and list_tables. pgTAP through execute_sql, each file
              wrapped as "begin; ... rollback;". The base tables still unreachable.
              get_advisors for security and performance.
4. Functions: deploy_edge_function      Edge Functions, after the schema they rely on
5. Verify:    call each function URL (base from get_project_url) with curl or a node
              fetch script, read get_logs, smoke the API through PostgREST on the new
              shape and the old
6. Front end: npm ci at the root, npm run build in web/, green. Hosting: deferred: no target chosen
7. Verify:    smoke the product flows on a local production build of web/ pointed at
              the project, with Playwright through npx playwright
8. Tag, then git push origin main and the tag.
```

Never apply SQL that is not in a migration file in the repo. A Supabase branch
(`create_branch`, `merge_branch`, `reset_branch`, `rebase_branch`, `delete_branch`) is
optional and ask-first, because it costs money. No gate requires one.

The database goes first and stays backward compatible for one release, so the deployed
client is never talking to a schema it does not know.

### Migrations

| Situation | Sequence |
|---|---|
| Additive, backward compatible | Apply the migration through the MCP, then release the client |
| Adding a non-null column | Three releases. Add nullable, backfill in batches, then set not null. Never one. |
| Removing a column or a field | Two releases. Stop reading it, deploy, then drop it. |
| Renaming | Never rename. Add the new, dual-write, backfill, stop reading the old, drop it. |
| Index on a large table | `create index concurrently`, outside a transaction block, in a migration of its own. `apply_migration` is reported to wrap each file in a transaction, where that fails, so the rule and its Shehab decision are in `actio-supabase` under Migrations |
| A new table | Its `enable row level security`, its policies and its grants ship in the **same** migration. A migration that adds a table and leaves the policy for later ships an open table. |

Migrations live in `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql` and are the database
source of record. They are hand-authored, forward-only, one concern per file, each with a
written reverse recorded in the run's rollback notes. **Never edit one once it has been
applied**: a correction is a new migration. There is no declarative `supabase/schemas/`
workflow, because generating a migration from it needs `supabase db diff`, which needs the
Supabase CLI and Docker, and neither is used. Schema files, if any exist, are not a source
of record.

A migration that is not backward compatible with the currently deployed client is not
applied. Split it.

### Front end, hosting deferred

Hosting deployment is out of scope until Shehab chooses a target. Until then the front-end
release is `npm ci` at the root and `npm run build` in `web/`, green, with the build log in evidence,
and the release record carries the line `Front-end hosting: deferred: no target chosen`.
That line is not a release-gate failure. The vendored `deploy-to-vercel`,
`vercel-cli-with-tokens` and `vercel-optimize` skills stay in the repository as reference
only, coupled to no agent, for when a deploy target is chosen.

### Edge Functions

Deployed with `deploy_edge_function` after the schema they depend on, never before, then
verified by calling the function URL (base from `get_project_url`) with curl or a node
fetch script, with logs read through `get_logs`. No local Deno. Secrets are never
committed. The Supabase MCP exposes no secrets tool and the Supabase CLI is not used, so
the release engineer can neither list nor set a secret: each one the code reads is named in
the ADR, Shehab sets it in the Supabase dashboard as the credential owner and confirms it
in writing, and the release engineer verifies it by calling the function and reading
`get_logs` for a missing-variable error. The `service_role` key lives in the Edge Function
environment and nowhere else. It never reaches the client or the repo: a hit for it in
anything the browser downloads stops the release.

---

## Post-release verification

The deploy command exiting zero proves the deploy ran. It proves nothing about the
product. Smoke the critical paths and attach evidence.

- [ ] The new surface loads on a phone viewport, captured with Playwright through
      `npx playwright`. Until a hosting target exists, that is a local production build of
      `web/` (`npm run build`, then `npm run start`) pointed at the Supabase project.
- [ ] One end-to-end flow the change touched, run as a user.
- [ ] The privacy invariants, probed against the project's data on a read path, through
      PostgREST under the publishable key and through `execute_sql` under
      `set local role`.
- [ ] Errors and latency in `get_logs`, for the API, Postgres and Edge Function services,
      compared against the hour before the first apply, not glanced at.
- [ ] No new error class in the logs.
- [ ] The Arabic and Indonesian variants of the changed screen load.

Evidence goes to `.actio/runs/<run-id>/evidence/release/post-release-*`.

---

## Tag and release note

```bash
git tag -a v0.4.0 -m "Privacy preview"
git checkout main
git merge --ff-only feat/privacy-preview
git push origin main
git push origin v0.4.0
```

`main` only ever moves by fast-forward to a release branch that passed pre-flight, and only
the release engineer pushes it.

The note is written to `.actio/runs/<run-id>/release-engineer/release-note.md` in Actio's voice: what changed, what it means for the reader, what
cannot be done yet. No marketing tone, no exclamation marks, no emoji.

```markdown
## v0.4.0 · 20 Mar 2026

**Privacy preview.** Ahead of the first response in a cycle, and from the persistent link
in every later message, an employee now sees the size of the group their answer is pooled
into, the smallest group the system will report on, the fields their manager can filter
by, and what happens to free text. Every figure is computed for the reader in front of it.

**Below the threshold.** A group smaller than five now sees the same screen with its own
size and the threshold, and nothing is reported from it to anyone.

**What this does not do yet.** The group size can change between the preview and the
submission. Today the preview shows the live figure at the moment it is read. Whether it
freezes at preview is an open decision.

**Fixed.** The below-threshold error named the filter that caused it, which let a manager
narrow towards an individual. It no longer does.
```

---

## Rollback

Decide fast, explain afterwards. A rollback is cheap; a bad release on a shift is not.

**Trigger a rollback without waiting to be asked when any of these is true:**

- A privacy invariant fails in production. Immediate, no discussion.
- Error rate above the pre-deploy baseline on any changed path.
- A user-facing flow the change touched is broken.
- A migration did not complete cleanly.
- Any data is being written that cannot be corrected later.

```
1. Front end: no hosted deployment exists while hosting is deferred, so nothing is
   promoted. Revert the release commits on main with git revert and push the revert.
   Never force-push.
2. Back end: redeploy the previous Edge Function source from the previous release tag
   with deploy_edge_function.
3. Migrations: if the release was backward compatible, leave them.
   If it was not, ship the written reverse from rollback.md as a new migration file and
   apply it with apply_migration, in the order rollback.md states. Never apply SQL that
   is not in a migration file in the repo.
4. Verify the product works on the previous version: list_migrations, pgTAP through
   execute_sql, get_advisors, and the smoke paths.
5. Write the rollback record: what happened, when, what was reverted, what data
   was affected, what the fix will be.
6. Tell Shehab. Immediately, with facts, no apology.
```

Then, and only then, work out why.

---

## What goes to Shehab first

Confirm before, not after, unless he already authorised it for this run:

- Any production deploy that is not already covered by the run's go.
- Choosing a front-end hosting target, and creating a Supabase branch, which costs money.
- Anything that sends a message to a real employee.
- Anything public: a repository going public, a release note published outside, a domain
  change.
- A rollback that loses data written since the deploy.
- Releasing with a known blocker, which is his override to make and is recorded in the
  ledger by the orchestrator.

---

## Release record

Written at `.actio/runs/<run-id>/release-engineer/deploy-log.md`, with the full pre-flight
output in `preflight.md` and the rollback plan in `rollback.md` beside it, all referenced
from the handoff.

```markdown
# Release · v0.4.0 · 2026-03-20T16:02:44Z

**Authorised by.** qc-lead go at 15:41:02Z. Orchestrator gate list clean, 0 findings.
**Branch.** feat/privacy-preview, 7 commits, no attribution present (checked).

## Pre-flight

All 24 checks pass. Output: `release-engineer/preflight.md`.

## Rollback plan, written before the first apply

Front end: no hosted deployment, revert the release commits on `main`. Back end: redeploy
Edge Functions from tag `v0.3.4` with `deploy_edge_function`. Migrations
`20260320150101_preview_cohort_view` and `20260320150102_preview_cohort_grants` are
additive and stay. `20260320150103_cohort_size_not_null` makes `cohort_size_at_preview`
non-null and reverses with the written reverse recorded in `rollback.md`, shipped as a new
migration file.

**Front-end hosting.** deferred: no target chosen.

## Sequence

| Time | Step | Result |
|---|---|---|
| 16:02 | db-test, PGlite | ok, 41 of 41, `evidence/release/db-test-pglite.tap` |
| 16:05 | apply_migration | 3 applied, `list_migrations` matches `supabase/migrations/` |
| 16:06 | pgTAP on the project | ok, 41 of 41, `evidence/release/pgtap-project.txt` |
| 16:07 | get_advisors, security and performance | 0 findings, `evidence/release/advisors.json` |
| 16:08 | deploy_edge_function | ok, called, `evidence/release/post-release-functions.txt` |
| 16:09 | API smoke | ok, `evidence/release/post-release-api.json` |
| 16:12 | npm run build | ok, `evidence/release/build.txt` |
| 16:16 | product smoke, local production build, phone viewport, EN and AR | ok, `evidence/release/post-release-flow-*.png` |
| 16:20 | get_logs vs previous hour | unchanged |
| 16:22 | tag v0.4.0, main fast-forwarded | pushed |
```
