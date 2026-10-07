# The Supabase MCP workflow: evidence, the limits of the offline proof, and what the swarm does not do

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it when you need the exact evidence file names under `evidence/backend/`, the full list of what the offline proof cannot prove, or when a task needs an Edge Function secret, a project setting, a local function run or project seed data. When the MCP does not answer, `actio-agent-protocol` Toolchain gives the blocked rule.

## Evidence

Every call above that produces output is saved under the run's `evidence/`. The back end's goes
in `evidence/backend/`, named so a reader knows where it ran:

| File | Holds |
|---|---|
| `db-test-pglite.tap` | The full offline run. Labelled PGlite in its name and on its first line, never passed off as the project |
| `pgtap-project-<test file>.tap` | Each `supabase/tests/*.test.sql` run on the project through `execute_sql` |
| `list-migrations.json`, `list-tables.json` | The project after the apply |
| `advisors-security.json`, `advisors-performance.json` | `get_advisors` output, with any written acceptance beside it |
| `explain-<query>.txt` | `EXPLAIN ANALYZE` output, labelled with where it ran |
| `edge-<function>-<case>.txt`, `edge-<function>-logs.txt` | The request, the response and the `get_logs` lines for a deployed function |

Save the offline run with `node .actio/bin/db-test.mjs > evidence/backend/db-test-pglite.tap`,
or `npm run db:test --silent`. A plain `npm run db:test` prints npm's own banner first, so
the file no longer opens with the PGlite line.

An empty result is not a pass. A pgTAP file's evidence shows the plan line, every `ok` and
`not ok` line and the final count. If `execute_sql` returns less than that, record exactly
what came back, treat the file as not run, and raise it as a `machinery_findings` entry
naming this skill, because the route to the project proof is then the thing that is broken.

## What the offline proof cannot prove

db-test is a proof that the migrations, seed and tests hold on real Postgres. It is not the
project, so it never replaces pgTAP through the MCP:

- No PostgREST, so no status code, header or error mapping is proved.
- No real pgTAP. The shim implements part of pgTAP's interface, listed in
  `.actio/bin/db-test-shim.sql`, and a function it lacks fails loudly.
- No Supabase platform: no Auth service, Storage or Edge Functions, no platform extensions
  such as `pg_net`, `pg_cron` or `pg_graphql`, and no advisors.
- Migrations run as a superuser offline, which the project's `postgres` role is not, so a
  privilege error can pass offline and fail on the project.
- PGlite is PostgreSQL 18, which may be newer than the project's version. Check the project's
  with `select version()` through `execute_sql` before relying on a feature added recently.
- It applies a migration one statement at a time. `apply_migration` sends the whole file,
  so a statement that cannot run inside a transaction block, such as
  `create index concurrently`, can pass offline and fail on the project.

## What the swarm does not do, and who does

- **Edge Function secrets.** No MCP tool sets them. The agent names every secret a function
  reads in its handoff, under `decisions_for_shehab`, and Shehab sets it in the Supabase
  dashboard. The value never passes through an agent, the repo or the run folder.
- **Project settings.** `supabase/config.toml`, if it exists, is read only by the Supabase CLI,
  which is not used, so it configures nothing. A setting the hosted project needs (exposed
  schemas, the API row cap, an Auth setting) is recorded in the handoff for Shehab to set in
  the dashboard.
- **Running an Edge Function locally.** Deferred, because it needs Deno. A function is proved
  deployed, on the dev project, and nowhere else.
- **Seeding the project.** `supabase/seed.sql` is applied offline by db-test. It is not a
  migration, so it never reaches the project through `apply_migration`. Loading seed rows into
  the project for a demo or a flow test is ask-first, because the project is also the release
  target.
- **Front-end hosting.** Deferred: no target chosen. See `actio-release`.
