---
name: actio-supabase
description: Build the Actio back end on Supabase. Use when writing migrations, RLS policies, database functions, Edge Functions, auth flows or pgTAP tests, when applying or proving any of them through the Supabase MCP, and when reviewing back-end code. Covers the toolchain (the Supabase MCP and the offline PGlite runner, with no Docker and no Supabase CLI), the RLS-first enforcement of the privacy invariants, the aggregate-threshold pattern, the auth model for frontline workers with no corporate email, and the traps that make RLS slow or unsafe.
---

# Supabase for Actio

The back end is Supabase: Postgres, Row Level Security, PostgREST, Edge Functions, Auth and Storage. This core holds the doctrine, the database workflow, the proofs every change needs and the traps. Code patterns, test files and the long rules are in `references/`, read on a trigger (table at the end). The toolchain card and the MCP-not-connected rule are in `actio-agent-protocol`. The vendored `supabase` and `supabase-postgres-best-practices` skills (`.agents/skills/`, read by path on demand) give the general craft; where they disagree with this skill, this wins, and their CLI steps and declarative-schema workflow are not used.

## The doctrine

**The privacy invariants are RLS policies, not application code.** An employee's answer must not reach a person who should not see it. A policy holds against a leaked anon key, a direct connection, a mistaken client query, an unreviewed Edge Function and a PostgREST call the front end never meant to make.

| Enforced where | Holds against |
|---|---|
| The client | Nothing |
| An Edge Function | Only calls that route through it |
| A view or definer function, base tables revoked | Every caller with no direct grant |
| **An RLS policy** | **Every caller, including one with a valid key** |

One enforcement point, in the database. Two that can disagree are a defect.

## Database workflow

Every agent that touches the database carries `mcp__supabase`.

| Job | How | Never |
|---|---|---|
| Iterate offline | `node .actio/bin/db-test.mjs` (or `npm run db:test`): PGlite, no Docker. Applies `supabase/migrations/*.sql` in order, then `seed.sql`, onto a Supabase-shaped bootstrap (`anon`, `authenticated`, `service_role`, `auth.uid()`), runs `supabase/tests/*.test.sql` under a pgTAP shim, prints TAP | A local Supabase stack |
| Iterate on the project | `execute_sql`; anything that changes schema runs inside `begin; ... rollback;` | DDL that commits outside a migration file |
| Apply | `apply_migration` once per file, in order: `name` is the slug, `query` the file's exact contents | SQL not in a migration file; a second apply |
| Verify | `list_migrations` matched on name (the MCP stamps its own version), then `list_tables` (RLS on every new table) | Reading success from the apply call |
| Prove | pgTAP on the project (a migration runs `create extension if not exists pgtap with schema extensions;`); each test file goes through `execute_sql` as it is, since every file opens `begin;` and ends `rollback;`; role checks use `set local role` and `set local request.jwt.claims` | An empty result read as a pass |
| Advisors | `get_advisors` for `security` and `performance`: clean, or every finding accepted in writing, before review and at the engineering gate | A finding with no written acceptance |
| Types | `generate_typescript_types` into `evidence/backend/database.types.ts`; `frontend-engineer` writes `web/src/lib/database.types.ts` from it | Hand-edited types |
| Edge Functions | `deploy_edge_function`, call the URL (`get_project_url`), read `get_logs` | Local Deno or serving |
| Branches | `create_branch`, `merge_branch`, `reset_branch`, `rebase_branch`, `delete_branch`: ask-first, they cost money | A gate that requires one |

Evidence goes under `evidence/backend/`, named for where it ran: `db-test-pglite.tap` (save with `node .actio/bin/db-test.mjs > evidence/backend/db-test-pglite.tap`, never plain `npm run db:test`, whose banner pushes the PGlite line off the top), `pgtap-project-<test file>.tap`, `list-migrations.json`, `list-tables.json`, `advisors-security.json`, `advisors-performance.json`, `explain-<query>.txt`, `edge-<function>-<case>.txt`, `edge-<function>-logs.txt`, `reverse-<slug>.sql`. A pgTAP file's evidence shows the plan line, every `ok` and `not ok` and the final count; anything less is not run, so record what came back and raise a `machinery_findings` entry naming this skill.

**The offline proof is not the project.** PGlite is real Postgres but: no PostgREST (no status code, header or error mapping proved); a pgTAP shim, not pgTAP; no Auth, Storage, Edge Functions, `pg_net`, `pg_cron`, `pg_graphql` or advisors; migrations run as superuser, so a privilege error can pass offline and fail on the project; PostgreSQL 18, so check the project's `select version()` before a recent feature; one statement at a time, so `create index concurrently` can pass offline and fail inside `apply_migration`. Full list, secrets, project settings and seeding: `references/mcp-workflow.md`.

## The invariants and the proofs they must have

Each is proved by pgTAP in `supabase/tests/`, offline and on the project. Code: `references/rls.md`, `references/functions.md`.

| Invariant | Mechanism | Proof |
|---|---|---|
| I1, I2 threshold | Base tables revoked from `anon` and `authenticated`; the only path is a security-definer function with `set search_path = ''` that counts the final filtered set against `greatest(5, tenant override)` and refuses before returning anything. The error is `below_threshold`, never the filter (R-01) | `is_empty` at 4, `lives_ok` at 5, `throws_ok` P0001 `below_threshold` on a narrowing filter, `42501` on the base table |
| I3 free text | Raw column ungranted; a `security_invoker = on` view rewords and strips names; **no client grant on the view** (BUG-0029: it is inert, and invites turning `security_invoker` off); only the definer function reads it, after the floor | Reworded value as owner; `not has_table_privilege('authenticated', <view>, 'select')` |
| I4 protected | A separate schema with its own grant, access by named assignment (`protected.handlers`), never a role name read from the token; the engagement queue reconciles from a count-only view | `is_empty` on the engagement queue; no usage on the schema |
| I5 to I7 close | `before update` trigger (definer, pinned), evidence checked in the same transaction under `select ... for update`, transition log, insert-only closures; `transition()` reads the actor from `(select auth.uid())` | Every illegal transition refused; close without evidence refused |

A change to a policy, grant, view or definer function that leaves `invariants.test.sql` untouched is a finding. A refusal is proved by `has_table_privilege`, never by `42501` alone (R-12).

## Traps

`code-analyst` and `security-analyst` check each one. Reasons and fixes in full: `references/traps.md`; the catalogue that finds most of them: `references/privilege-review.md`.

1. A bare `auth.uid()` in a policy: wrap it, `(select auth.uid())`.
2. A policy filtering on an unindexed column: index it.
3. A definer without `set search_path = ''`: pin it, qualify every reference.
4. A view over protected data without `security_invoker = on`.
5. A client grant on a `security_invoker` view over a revoked base table: inert, remove it. To hide columns only, grant the permitted columns on the base table and put a view over exactly those.
6. RLS enabled with no policy: write the policy in the same migration.
7. `service_role` in a client bundle: Edge Function secrets only.
8. A table with no `enable row level security`: every table, in its creating file.
9. Policies for `select` only: write all four, even `false`.
10. `using` without `with check` on an update policy: both.

`get_advisors` catches several of these. A clean advisor run with a bare `auth.uid()` is still a finding.

## Migrations

Hand-authored in `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql`, one concern per file, timestamp from the shell (`node -e "console.log(new Date().toISOString().replace(/\D/g,'').slice(0,14))"`), forward-only: a correction, even a reviewer's, is a new migration. Each has a written reverse in `.actio/runs/<run-id>/backend-engineer/reverse.md`, with the lock each statement takes, proved offline with `--reverse` while its migration is the newest. Prove offline, then in `begin; ... rollback;` on the project, then `apply_migration` once, then verify. A table's RLS, policies and grants ship in its own migration. An index on a populated table needs `concurrently` outside a transaction, which `apply_migration` may not allow: that is Shehab's decision before the apply, never a quiet drop. Three steps for a non-null column, never a rename, a backfill never merged with a schema change. Full rules: `references/migrations.md`.

## Before handing off

- [ ] Every new table: `enable row level security` in its creating file, all four command policies (even `false`), update with `using` and `with check`
- [ ] Base tables holding response, cohort or protected data revoked from `anon` and `authenticated`; no client grant on a `security_invoker` view over one; where clients read a view, every column it reads is granted to them
- [ ] Every definer pins `search_path = ''`, qualifies references, and has `execute` revoked from public and `anon`; every view over protected data is `security_invoker = on`
- [ ] Every policy wraps `auth.uid()` in a scalar subquery; every column a policy filters on is indexed
- [ ] Every invariant error names the invariant, not the input
- [ ] `invariants.test.sql` covers every invariant touched and passes offline (`db-test-pglite.tap`) and on the project (`pgtap-project-invariants.tap`)
- [ ] The catalogue in `references/privilege-review.md` returns only what the design intends, output saved
- [ ] No `service_role` outside Edge Function secrets
- [ ] Each migration is hand-authored with its reverse in `reverse.md`, proved offline and in a rolled-back transaction, then applied once; `list_migrations` and `list_tables` saved
- [ ] `get_advisors` clean for `security` and `performance`, or accepted in writing, output saved
- [ ] Types regenerated into `evidence/backend/database.types.ts`; `web/src/lib/database.types.ts` named stale in the handoff
- [ ] Each Edge Function deployed and proved by a call to its URL, `get_logs` saved; each secret and project setting named in `decisions_for_shehab`, no value anywhere
- [ ] MCP not connected: `status` `blocked`, reason `supabase MCP not authorised`, PGlite proof attached

## References

| File | Holds | Read when |
|---|---|---|
| `references/rls.md` | I1 to I4 code: the threshold function, the reworded view, the column-level shape, the protected schema | Before writing or reviewing any policy, grant, view or definer function |
| `references/functions.md` | The I5 to I7 trigger; PostgREST conventions: reads, writes, errors, keyset pagination, times, enums | A transition trigger, RPC, error code or paginated read |
| `references/pgtap.md` | The invariants test file as a specification; offline and project runs | Writing or changing a test file |
| `references/migrations.md` | The migration rules in full | Writing, proving or applying a migration |
| `references/traps.md` | The RLS trap table with reasons | Writing or reviewing a policy |
| `references/edge-functions.md` | Per-function idempotency rules, deploy and proof | Any Edge Function |
| `references/auth.md` | The survey token flow, JWT claims, session rules | The token flow, claims or sign-out |
| `references/mcp-workflow.md` | Evidence names, offline-proof limits, secrets, settings, seeding | Evidence names; a secret, setting or seed |
| `references/privilege-review.md` | The P1 to P11 catalogue, R-12 refusal proofs, the diff reading list | Reviewing grants and policies; backend self-check |
