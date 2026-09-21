---
name: actio-release
description: Release Actio safely: pre-flight checks, commit and branch conventions, deployment, post-deploy verification, release notes and rollback. Use when preparing a release, committing, deploying, or rolling back.
---

# Release

The release engineer is the only role that pushes to a remote or to an environment.
Everything here is a check, not an intention.

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

- [ ] Front end builds clean, no new warnings.
- [ ] Type check passes.
- [ ] Lint passes.
- [ ] Back end: `python manage.py check --deploy` clean.
- [ ] Full test suite green, including the privacy invariant module. Attach the output.
- [ ] `makemigrations --check --dry-run` produces nothing. No uncommitted model change.

### Safety

- [ ] No secret in the diff: `git diff origin/main... | grep -Ei '(secret|token|password|api[_-]?key)\s*[=:]'`.
- [ ] No debug code, no `console.log`, no `breakpoint()`, no commented-out block.
- [ ] Every migration reversible, or the irreversibility stated in its docstring.
- [ ] No migration takes an exclusive lock on a large live table.
- [ ] Environment variables the change needs are present in the target, verified by
      reading the target, not by memory.
- [ ] Feature flag present where the rollout needs one.
- [ ] **Rollback plan written, before the deploy, in the release record.**

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
1. Back end: deploy the code, with the new API shape additive.
2. Back end: run migrations.
3. Verify: smoke the API against the new shape and the old.
4. Front end: deploy to Vercel.
5. Verify: smoke the product flows.
6. Tag.
```

### Migrations

| Situation | Sequence |
|---|---|
| Additive, backward compatible | Deploy code, then migrate. Safe in either order, so pick one and keep it. |
| Adding a non-null column | Three releases. Add nullable, backfill, then make non-null. Never one. |
| Removing a column or a field | Two releases. Stop writing it, deploy, then drop it. |
| Renaming | Never rename. Add the new, dual-write, backfill, stop reading the old, drop it. |
| Index on a large table | `CONCURRENTLY`, migration marked `atomic = False` |

A migration that is not backward compatible with the currently deployed code is not
deployed. Split it.

### Front end, Vercel

Use the vendored `deploy-to-vercel` and `vercel-cli-with-tokens` skills for the mechanics.
Preview deploy first, smoke it, then promote. Never deploy straight to production on a
change that touched a user-facing flow.

### Back end, Django

Its own target, not Vercel. Health check green before traffic moves. Workers restarted
after the code deploy so tasks pick up the new code.

---

## Post-deploy verification

The deploy command exiting zero proves the deploy ran. It proves nothing about the
product. Smoke the critical paths and attach evidence.

- [ ] The new surface loads, in production, on a phone viewport.
- [ ] One end-to-end flow the change touched, run as a user.
- [ ] The privacy invariants, probed against production data on a read path.
- [ ] Error rate and latency compared against the hour before, not glanced at.
- [ ] No new error class in the logs.
- [ ] The Arabic and Indonesian variants of the changed screen load.

Evidence goes to `.actio/runs/<run-id>/evidence/post-deploy-*`.

---

## Tag and release note

```bash
git tag -a v0.4.0 -m "Privacy preview"
git push origin v0.4.0
```

The note is written in Actio's voice: what changed, what it means for the reader, what
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
1. Front end: promote the previous Vercel deployment.
2. Back end: redeploy the previous image.
3. Migrations: if the deploy was backward compatible, leave them.
   If it was not, run the reverse migration, in the order the docstring states.
4. Verify the product works on the previous version.
5. Write the rollback record: what happened, when, what was reverted, what data
   was affected, what the fix will be.
6. Tell Shehab. Immediately, with facts, no apology.
```

Then, and only then, work out why.

---

## What goes to Shehab first

Confirm before, not after, unless he already authorised it for this run:

- Any production deploy that is not already covered by the run's go.
- Anything that sends a message to a real employee.
- Anything public: a repository going public, a release note published outside, a domain
  change.
- A rollback that loses data written since the deploy.
- Releasing with a known blocker, which is his override to make and is recorded in the
  ledger.

---

## Release record

Written at `.actio/runs/<run-id>/release-engineer/release.md`, and referenced from the
handoff.

```markdown
# Release · v0.4.0 · 2026-03-20T16:02:44Z

**Authorised by.** qc-lead go at 15:41:02Z. Orchestrator gate list clean, 0 findings.
**Branch.** feat/privacy-preview, 7 commits, no attribution present (checked).

## Pre-flight

All 24 checks pass. Output: `evidence/preflight.log`.

## Rollback plan, written before deploy

Front end: promote deployment `dpl_8Fh2...`. Back end: redeploy image `actio-api:0.3.4`.
Migrations `0031` and `0032` are additive and stay. `0033` makes `cohort_size_at_preview`
non-null and reverses cleanly with `migrate surveys 0032`.

## Sequence

| Time | Step | Result |
|---|---|---|
| 16:02 | back end deploy | ok, health green |
| 16:05 | migrate | 3 applied, 1.2s |
| 16:06 | API smoke | ok, `evidence/post-deploy-api.json` |
| 16:09 | front end preview | ok, `evidence/post-deploy-preview.png` |
| 16:14 | promote | ok |
| 16:16 | product smoke, phone viewport, EN and AR | ok, `evidence/post-deploy-flow-*.png` |
| 16:20 | error rate vs previous hour | unchanged |
| 16:22 | tag v0.4.0 | pushed |
```
