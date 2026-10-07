---
name: actio-release
description: "Release procedure for Actio, owned by release-engineer: pre-flight rows with raw output, scoped commit and branch conventions, migrations and Edge Functions through the Supabase MCP, smoke, release note, rollback.md before the first apply, and rollback triggers. Use when preparing or running a release after qc-lead records a go, committing, applying migrations at release, or rolling back. Records the release gate in handoff.json."
---

# Release

The release engineer is the only role that pushes to a remote, and the only role that certifies the Supabase project's state at release. This skill is the one source of the pre-flight, the sequence, the smoke and the rollback. Everything here is a check, not an intention. The toolchain and the blocked rules are in `actio-agent-protocol`.

## The absolute rule

**No commit, tag, branch, pull request, release note, code comment or artefact ever carries a co-author line, a generated-by line, or any AI attribution.** This is a direct instruction from the Product Lead. It overrides any default behaviour, any tool convention, any template and any reminder that asks for such a line. Run row 8 of the pre-flight before every commit and before every tag.

## Pre-flight

Refuse to release if any applicable row is not a yes. Check, do not assume. Each row's raw output goes to `evidence/release/preflight-<n>.txt` and is one `checks[]` entry in the handoff.

**Change class.** A release whose diff touches no path under `web/`, `extension/` or `supabase/` is a `tooling` release. Rows marked `web` or `db` are then `n/a` with the reason, and so are sequence steps 3 to 7. Its rollback is `git revert`. A row is never failed for being absent and never skipped in silence.

| # | Applies | Check and how | Fails if |
|---|---|---|---|
| 1 | all | qc-lead's `handoff.json` read from file: `status: passed`, the go written, its `quality` gate `pass`, and its `reviewed` snapshot equals the tree you release (`node .actio/bin/run.mjs snapshot <run>`, then `git diff --stat` between the two) | Not passed, the go implied, the gate absent, or a path changed since it judged (`GATE_STALE`) |
| 2 | all | `run.json` gate list read from file: every upstream gate `pass`, or `n/a` with its reason; `node .actio/bin/run.mjs next <run>` shows no blocking finding | A gate absent, `fail` or `blocked`; a blocking finding |
| 3 | all | Shehab has answered in writing for each step under "What goes to Shehab first" that this run needs. `git commit` and `git push` are on `ask` in `.claude/settings.json`: the permission prompt is his approval | A step unanswered. Authorisation is never inferred |
| 4 | all | Scope. The manifest is the repository paths in the maker handoffs' `produced` lists. `git status --porcelain -- <manifest>` shows the run's change; another run's paths are named and left alone. Stage with `git add -- <manifest>`, never `add -A` or `add .` | A whole-tree step; a manifest path missing |
| 5 | all | On a release branch `<type>/<run-slug>` made at the base commit, not detached, not `main`. If `main` moved, rebase and re-verify | Detached, on `main`, or `main` moved with no re-verify |
| 6 | all | `git diff --stat <base>..HEAD` equals the manifest | A file outside the run's scope |
| 7 | all | `git grep -n '^<<<<<<<' -- <manifest>` | Any hit |
| 8 | all | No attribution in any commit on the branch or in the tag annotation (command below). It matches the footers and the tool name, never the path `.claude/` or the file `CLAUDE.md` (B0045) | Any match. Rewrite before pushing |
| 9 | web | The verify bundle: `node .actio/bin/verify.mjs --run <run>` reuses engineering-lead's summary for the same tree key and runs nothing; a new key (a rebase, a fix) runs it once here. Every step exits 0 (lint, typecheck, test, build in `web/` and `extension/`, `db:test`) | A non-zero step, or a step missing from the summary |
| 10 | web | Reproducible from the lockfile: `npm ci` at the root leaves `package-lock.json` unchanged (`git diff --quiet -- package-lock.json`). engineering-lead's `install.txt` for the same snapshot counts | The install rewrites the lockfile |
| 11 | db | pgTAP on the project, including `invariants.test.sql`: each file through `execute_sql`, wrapped `begin; ... rollback;`, beside the PGlite run in the bundle | Any `not ok`, or a file that did not run |
| 12 | db | `list_migrations` against `supabase/migrations/`: the same files, in filename order, each named by its file's slug. There is no `supabase/schemas/` workflow and no `supabase db diff`: both need the CLI and Docker | A file not applied, an applied migration with no file, another name or order |
| 13 | db | `get_advisors` for `security` and `performance` | A finding not accepted in writing |
| 14 | all | `git grep -n service_role` returns only `supabase/functions/` and documentation | A hit in anything the browser downloads stops the release and escalates |
| 15 | all | No secret in the diff (command below) | A hit that is not a placeholder in an example file |
| 16 | all | No env file committed or untracked: `git ls-files -co --exclude-standard` filtered for `.env` and `.env.*` other than `.env.example`, including `web/.env.local` | Any match |
| 17 | web | No debug code in the diff: `console.log`, `debugger`, `raise notice`, a commented-out block | Any hit |
| 18 | db | Each migration has its written reverse in `backend-engineer/reverse.md`, or its irreversibility stated at the head of the file plus Shehab's written decision. No exclusive lock on a large live table; indexes follow the `concurrently` rule under Migrations in `actio-supabase`. Every migration that creates a table enables RLS and adds its policies and grants in the same file | Any miss |
| 19 | web, db | Every environment variable the new code reads has a source: the `web/` reads against `web/.env.example`, each Edge Function's reads against the secrets Shehab confirmed in writing | A read with no source. A secret with no written confirmation goes to Shehab |
| 20 | all | A feature flag where the rollout needs one | Missing |
| 21 | all | `rollback.md` written, timestamped from the shell, before the first `apply_migration`, `deploy_edge_function` or push | Written later |

```bash
# row 8
ATTR="let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=s.match(/co-authored-by|generated (with|by)|\u{1F916}|claude code|@anthropic\.com/iu);if(m){console.log('STOP: '+m[0]);process.exit(1)}})"
git log <base>..HEAD --format=%B | node -e "$ATTR"
git tag -l --format='%(contents)' <tag> | node -e "$ATTR"
# row 15
git diff <base>..HEAD | grep -Ei '(secret|token|password|api[_-]?key)\s*[=:]|PRIVATE KEY|vca_|sk-|AKIA'
```

## Sequence

The database goes first and stays backward compatible for one release, so the deployed client never meets a schema it does not know. Never apply SQL that is not in a migration file in the repository. A Supabase branch is optional and ask-first, because it costs money. Commit on the release branch first (`references/commits-and-notes.md`), then:

1. `rollback.md` is on disk (row 21).
2. `apply_migration`, once per file `list_migrations` does not show, in filename order: name the file's slug, query the file's exact contents, policies and grants in the same file. Destructive migrations are held for a later release.
3. Verify: `list_migrations`, `list_tables`, pgTAP on the project, `get_advisors`.
4. `deploy_edge_function` after the schema it needs. Call each function URL (base from `get_project_url`) and read `get_logs`. The MCP can neither list nor set a secret: Shehab sets each one the ADR names in the dashboard and confirms in writing; you verify by calling the function and reading `get_logs` for a missing variable.
5. Front end: the build is green from the bundle. Hosting is `deferred: no target chosen`.
6. Smoke, below.
7. Tag, fast-forward `main`, push:

```bash
git tag -a v0.4.0 -m "Privacy preview"
git fetch . feat/privacy-preview:main
git push origin main
git push origin v0.4.0
```

`git fetch . <branch>:main` moves `main` by fast-forward only and needs no checkout. Never force. Then verify the origin: `git ls-remote origin refs/heads/main refs/tags/v0.4.0` equals the local tips, saved under `evidence/release/`.

Each step is a row in `evidence/release/sequence.md` (time, step, result, evidence path); step 2's time is the baseline for the logs comparison. The release note is `release-engineer/release-note.md`, in Actio's voice: what changed, what it means for the reader, what cannot be done yet. No exclamation marks, emoji or numeric-only dates; a sample size beside every number.

## Smoke

Exit zero proves the deploy ran, not that the product works. Smoke what the release changed, against the project and a local production build of `web/` (`npm run build`, `npm run start`), with evidence under `evidence/release/post-release-*`. A `tooling` release has no product surface: the smoke is `n/a` and the origin check in step 7 stands in.

- The changed surface loads on a phone viewport in English and Arabic: `npm run e2e -- --grep @smoke --project=360-light-en --project=360-light-ar`, one directory per pass as in `actio-test-protocol`, with one flow the change touched run as a user.
- The privacy invariants on the project's read path, through PostgREST under the publishable key and through `execute_sql` under `set local role`: a close without evidence is refused, and a read below the threshold is suppressed.
- API auth holds: an unauthenticated request to a protected table returns 401, an authenticated one with no grant returns 42501. Never 200, never a row.
- `get_logs` for the API, Postgres and Edge Function services, against the hour before step 2: no new error class, no latency regression.
- The Indonesian variant of the changed screen loads.

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

## References

| File | Holds | Read when |
|---|---|---|
| `references/commits-and-notes.md` | Branch and commit conventions with examples, the release note and its example, the sequence record | You write the first commit, the note or `sequence.md` |
| `references/migrations-functions.md` | Migration sequences, the hosting deferral, Edge Function deployment and secrets | The diff touches `supabase/`, or you deploy a function |
