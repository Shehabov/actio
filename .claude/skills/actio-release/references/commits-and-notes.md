# Commits, tags, the release note and the sequence record

Read when: you write the first commit, the release note or `evidence/release/sequence.md` of a release. The pre-flight and the sequence are in `SKILL.md`; the commands for the tag and the push are there too (`git fetch . <branch>:main`, never a checkout of `main`).

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

## The release note

`.actio/runs/<run-id>/release-engineer/release-note.md`, in Actio's voice: what changed, what it means for the reader, what cannot be done yet. No marketing tone, no exclamation marks, no emoji. Read it aloud: if it sounds like marketing, rewrite it. English and Arabic when the change is user-facing.

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

## The sequence record

`evidence/release/sequence.md` is the v2 name for this record: one row per step, with the time, the result and the evidence path. The example is the v1 `deploy-log.md`, with its pre-flight line moved to the v2 paths.

```markdown
# Release · v0.4.0 · 2026-03-20T16:02:44Z

**Authorised by.** qc-lead go at 15:41:02Z. Orchestrator gate list clean, 0 findings.
**Branch.** feat/privacy-preview, 7 commits, no attribution present (checked).

## Pre-flight

All applicable checks pass. Output: `evidence/release/preflight-<n>.txt`.

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
