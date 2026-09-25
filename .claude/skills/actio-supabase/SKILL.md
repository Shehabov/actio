---
name: actio-supabase
description: Build the Actio back end on Supabase. Use when writing migrations, RLS policies, database functions, Edge Functions, auth flows or pgTAP tests, when applying or proving any of them through the Supabase MCP, and when reviewing back-end code. Covers the toolchain (the Supabase MCP and the offline PGlite runner, with no Docker and no Supabase CLI), the RLS-first enforcement of the privacy invariants, the aggregate-threshold pattern, the auth model for frontline workers with no corporate email, and the traps that make RLS slow or unsafe.
---

# Supabase for Actio

The back end is Supabase: Postgres, Row Level Security, PostgREST, Edge Functions, Auth and
Storage. There is no Django.

Two vendored skills carry the general craft and are read alongside this one:
`supabase` for products, clients and MCP usage, and `supabase-postgres-best-practices` for
schema, indexes, locking and query performance. They live at `.agents/skills/supabase/SKILL.md`
and `.agents/skills/supabase-postgres-best-practices/SKILL.md`; their `.claude/skills/` symlinks
are machine-local and gitignored, so read them by path rather than expecting them preloaded.
**This skill carries only what is specific to Actio**, and where it disagrees with either, this
skill wins because the invariants are the product's claim. The vendored `supabase` skill also
teaches Supabase CLI commands, CLI fallbacks and a declarative `supabase/schemas/` workflow.
None of that is used here: the toolchain below replaces it.

---

## Toolchain

This section is the canonical statement of how the swarm does database work. Every other file
cites it rather than restating it.

Present on the machine: git, node 24, npm, npx, and the Supabase MCP server (`supabase` in
`.mcp.json`, scoped to one project). Nothing else may be assumed.

The swarm does not depend on Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, jq
or python. None of them is a required step, a gate criterion, an evidence source or an
allowed permission. A tool that is missing is reported as blocked, never faked.

Database work goes through the Supabase MCP. Every agent that touches the database carries
`mcp__supabase` in the `tools` line of its frontmatter.

| Job | How | Never |
|---|---|---|
| Iterate offline | `node .actio/bin/db-test.mjs`, also `npm run db:test` at the root. PGlite: real Postgres compiled to WebAssembly, no Docker. It applies `supabase/migrations/*.sql` in filename order, then `supabase/seed.sql`, onto a Supabase-shaped bootstrap with the `anon`, `authenticated` and `service_role` roles and `auth.uid()` and `auth.jwt()`, then runs `supabase/tests/*.test.sql` under a pgTAP-compatible shim and prints TAP | A local Supabase stack. There is none. |
| Iterate on the project | `execute_sql` against the dev project. Anything that changes the schema runs inside `begin; ... rollback;`, so the project only ever changes through `apply_migration` | DDL that commits outside a migration file |
| Apply | `apply_migration` once per migration file, in filename order: `name` is the file's slug, `query` is the file's exact contents | SQL that is not in a migration file in the repo. A second apply of the same file. |
| Verify the apply | `list_migrations`, matched on name, because the MCP stamps its own version when it applies; then `list_tables`, which also shows RLS enabled on every new table | Reading success from the apply call alone |
| Prove | pgTAP on the real project. A migration enables it: `create extension if not exists pgtap with schema extensions;`. Each test file runs through `execute_sql` wrapped as `begin; ... rollback;`: every test file already opens with `begin;` and ends with `rollback;` (see pgTAP below), so its exact contents are the query, and a file that does not is wrapped before it is sent, never wrapped twice. Role and RLS checks use `set local role anon` or `set local role authenticated` and `set local request.jwt.claims` inside that transaction. The offline db-test run is evidence too, labelled as PGlite | An empty result read as a pass |
| Advisors | `get_advisors` for type `security` and type `performance`. Clean, or every finding accepted in writing, before review and again at the engineering gate | A finding left open with no written acceptance |
| Types | `generate_typescript_types`, written to `web/src/lib/database.types.ts` | Hand-edited generated types |
| Edge Functions | `deploy_edge_function`, then call the function URL (base from `get_project_url`) with curl or a node fetch script; logs via `get_logs` | Local Deno, or serving a function locally |
| Debugging | `get_logs` | Guessing from the client error alone |
| Docs | `search_docs` | Working from memory |
| Client config | `get_project_url` and `get_publishable_keys` (use `get_anon_key` if that is the tool the server exposes), written to `web/.env.local`, which is gitignored | The service role key in the client or in the repo. Ever. |
| Branches | `create_branch`, `merge_branch`, `reset_branch`, `rebase_branch` and `delete_branch` are optional and ask-first, because they cost money | A gate that requires one |

### Evidence

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

### What the offline proof cannot prove

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

### When the MCP is not connected

If the Supabase MCP is not connected (its tools are missing, or a call returns an auth error),
nothing is faked. Run the offline PGlite proof with `node .actio/bin/db-test.mjs`, set `status`
to `blocked` with the reason `supabase MCP not authorised` in the handoff, and the orchestrator
escalates to Shehab, who authorises it with `/mcp`.

### What the swarm does not do, and who does

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

---

## The doctrine

**The privacy invariants are RLS policies, not application code.**

Actio's entire claim is that an employee's answer cannot reach a person who should not see
it. On Supabase that claim is strongest when it is enforced in the database, because a
policy holds against a leaked anon key, a direct database connection, a mistaken client
query, a future Edge Function nobody reviewed, and a PostgREST call the front end was never
meant to make.

| Enforced where | Holds against |
|---|---|
| The client | Nothing |
| An Edge Function | Only calls that route through that function |
| A view or a service-definer function, with base tables revoked | Every caller that has no direct grant |
| **An RLS policy** | **Every caller, including one with a valid key** |

One enforcement point, in the database. `actio-architecture` calls two enforcement points
that can disagree a defect, and that rule holds here.

---

## Layout

```
supabase/
├── migrations/                           the database source of record
│   └── <yyyymmddhhmmss>_<slug>.sql       hand-authored, forward-only, one concern per file
├── seed.sql                              seed, applied offline after the migrations
├── functions/                            Edge Functions, one directory each
│   ├── survey-token/index.ts             validates a signed link, mints a scoped JWT
│   ├── send-invite/index.ts              WhatsApp and SMS delivery, idempotent
│   └── webhook-delivery/index.ts         provider callbacks, idempotent on provider message id
└── tests/
    ├── invariants.test.sql               pgTAP. I1 to I4. The product's claim, as tests.
    ├── state_machine.test.sql            pgTAP. I5 to I7.
    └── rls.test.sql                      pgTAP. Every table, every role, positive and negative.
```

**Migrations are the source of record, and they are hand-authored.** Each has a written reverse
recorded in the run's rollback notes. There is no declarative `supabase/schemas/` workflow:
generating a migration from it needs `supabase db diff`, which needs the Supabase CLI and
Docker, and neither is used. Schema files, if any exist, are not a source of record: nothing
applies them and nothing tests them, so they are never read as the current schema. The rules
for writing a migration are under Migrations below. The whole repository layout, `web/`
included, is in `actio-architecture`.

---

## The invariants as policies

### I1 and I2: the reporting threshold

**The hard part, and the reason this section is long.** RLS is row-level. The threshold is
an aggregate property: a cohort of four must not report *at all*, which is a fact about the
set, not about any row in it. A row policy cannot express it.

The pattern is: **revoke the base tables entirely, and expose the reporting surface only
through security-definer functions that apply the threshold before returning anything.**

```sql
-- In the migration that creates these tables. Revokes come first, and they are not optional.
revoke all on public.responses          from anon, authenticated;
revoke all on public.cohorts            from anon, authenticated;
revoke all on public.protected_cases    from anon, authenticated;

-- The reporting surface. This is the only way a manager reaches response data.
grant execute on function public.cohort_report(uuid, jsonb) to authenticated;
```

```sql
-- supabase/migrations/<yyyymmddhhmmss>_cohort_report.sql
create or replace function public.cohort_report(p_cycle uuid, p_filters jsonb)
returns table (dimension text, value numeric, n integer)
language plpgsql
security definer
set search_path = ''                    -- pinned. An unpinned search_path is an exploit.
as $$
declare
  v_floor integer;
  v_n     integer;
begin
  -- The floor is a constant with a per-tenant raise, never a lower.
  select greatest(5, o.reporting_threshold)
    into v_floor
    from public.organisations o
    join public.cycles c on c.organisation_id = o.id
   where c.id = p_cycle;

  select count(*) into v_n
    from public.responses r
   where r.cycle_id = p_cycle
     and public.matches_filters(r, p_filters);

  -- I1 and I2 in one place. Below the floor, nothing is returned, and the
  -- error names the invariant rather than the filter that tripped it.
  -- Manager-facing only. An employee's view of their own cohort returns
  -- below_threshold: true instead; see the Below threshold row in actio-architecture.
  if v_n < v_floor then
    raise exception 'below_threshold' using errcode = 'P0001';
  end if;

  return query
    select d.dimension, avg(d.value)::numeric, v_n
      from public.response_dimensions d
      join public.responses r on r.id = d.response_id
     where r.cycle_id = p_cycle
       and public.matches_filters(r, p_filters)
     group by d.dimension;
end;
$$;
```

Three things that are not negotiable:

1. **`set search_path = ''`** on every security-definer function, with every reference
   schema-qualified. Without it a caller can create a shadowing object in a schema they
   control and run their own code as the definer.
2. **The error names the invariant, never the input.** `below_threshold`, never
   `below_threshold: shift`. Naming the filter lets a manager binary-search their way to an
   individual, which is the exact failure the threshold exists to prevent. This is standing
   rule R-01 in `BUGS.md`.
3. **Base tables are revoked.** If `authenticated` can `select` on `responses`, every policy
   above is decoration.

### I3: free text is returned reworded, with names removed

The raw column never crosses the boundary. The only client path to free text is the
security-definer read function, which applies the reporting floor first. The view shapes
the text for that function and is granted to no client role.

```sql
-- supabase/migrations/<yyyymmddhhmmss>_response_feedback_view.sql
create view public.response_feedback
with (security_invoker = on) as
  select r.id,
         r.cycle_id,
         r.site_id,
         public.reword_and_strip_names(r.free_text) as free_text
    from public.responses r;

revoke all on public.responses from anon, authenticated;
revoke all on public.response_feedback from anon, authenticated;
-- No client grant on the view. public.site_insights (security definer, floor applied
-- before any measure) selects from it and is the path clients call.
```

How `security_invoker` behaves decides the shape, so be exact about it. A
`security_invoker` view resolves privileges as whoever runs it, and the caller needs a
grant on every column the view reads. Inside the security-definer function that caller is
the function owner, who can read `public.responses`, so the excerpts are produced. A client
selecting the view directly holds no grant on `public.responses`, so the select fails with
`42501`. A client grant on this view is therefore inert, and it invites a later reader to
"fix" the refusal by turning `security_invoker` off, which would expose every response at
every size through a view whose name says it is the safe one. So the view carries no client
grant, and `security_invoker = on` stays as the second lock for the day someone adds one.

This is BUG-0029. The pattern this section used to show, a client grant on a
`security_invoker` view over a revoked base table, refuses every caller.

When a view only needs to hide columns, never to transform one, there is a second shape
that does let clients read it directly: grant `select` on the permitted columns of the base
table (column-level grants), keep RLS on the table for rows, and put a `security_invoker`
view over exactly those columns to shape the read. It works because the view reads nothing
the caller cannot. It does not work for I3, because rewording needs the raw column, and a
grant on the raw column would let the caller read it from the table directly.

```sql
-- Hiding columns, not transforming one: the columns a client may read are granted, the
-- rest are not, and the view reads only what the caller can read.
revoke all on public.members from anon, authenticated;
grant select (id, site_id, display_name) on public.members to authenticated;
create view public.member_directory
with (security_invoker = on) as
  select id, site_id, display_name from public.members;
grant select on public.member_directory to authenticated;
```

### I4: protected cases leave the engagement workflow entirely

A separate table in a separate schema, with a separate grant. Not a flag on `issues`,
because a flag can be forgotten in a `where` clause and a missing grant cannot.

```sql
create schema protected;
revoke all on schema protected from anon, authenticated;
grant usage on schema protected to protected_handler;

alter table protected.cases enable row level security;

-- Access is a named assignment, not a role name read from the token: boundary B8 in
-- tech-architect calls a permission derived from a role name erosion.
create policy case_handler_only on protected.cases
  for select to protected_handler
  using ( exists (
    select 1 from protected.handlers h
     where h.user_id = (select auth.uid())
       and h.organisation_id = protected.cases.organisation_id ) );
```

`protected.handlers.user_id` and `organisation_id` are indexed, like every column a policy
filters on.

The engagement queue reconciles its count from a view that returns the count alone and no
row content, so a reader can see that something exists without seeing what.

### I5 to I7: the state machine

Guarded in a trigger, so no path reaches `closed` without evidence, whatever wrote the row.

```sql
create or replace function public.guard_issue_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    if not exists (select 1 from public.evidence e where e.issue_id = new.id) then
      raise exception 'evidence_required' using errcode = 'P0001';
    end if;
    insert into public.closures (issue_id, closed_by, closed_at, days_late)
    values (new.id, auth.uid(), now(),
            greatest(0, (now()::date - new.due)::integer));
  end if;

  if new.lane is distinct from old.lane
     and not public.lane_has_authority(new.lane, new.category) then
    raise exception 'lane_lacks_authority' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger issue_transition_guard
  before update on public.issues
  for each row execute function public.guard_issue_transition();
```

A trigger rather than a policy, because a policy decides *whether a row is visible or
writable* and this is a rule about *what a valid transition is*. Both are database-level and
neither is bypassable from a client.

---

## Auth, for a workforce with no corporate email

Supabase Auth's email and password flow does not fit this product. The reader is a frontline
worker on WhatsApp or SMS, often on a shared handset, often with no company email address.

**The flow:**

1. `send-invite` mints a signed, single-use, short-lived token and delivers the link over
   the WhatsApp utility template or SMS.
2. The reader opens it. `survey-token` validates the signature and the single-use record,
   then issues a Supabase session whose JWT carries only what RLS needs.
3. RLS reads the claims. The token never carries anything that identifies the reader to
   their manager.

```jsonc
// custom claims on the survey JWT. Deliberately minimal.
{
  "sub": "<employee uuid>",
  "site_id": "<uuid>",
  "cycle_id": "<uuid>",
  "cohort_id": "<uuid>",
  "role": "respondent"        // respondent | team_lead | operations | leadership | protected_handler
}
```

| Rule | Why |
|---|---|
| The session is scoped to one cycle and expires with it | A link forwarded to a colleague, or left on a shared handset, opens nothing after the cycle closes |
| Single use, recorded server side | A replayed link is refused, and the refusal is logged |
| No refresh token on the respondent session | There is nothing to steal from a shared device |
| Sign out clears local storage completely | The next worker on that handset sees nothing |
| The `service_role` key never leaves a server context | It bypasses every policy. In a browser bundle it is a full data breach. |

Managers and operations use normal Supabase Auth with a real account, because they have one.

---

## PostgREST conventions

PostgREST replaces DRF. The contract lives in `actio-architecture` and does not change
shape; only the transport does.

| Concern | Convention |
|---|---|
| Reads | A view or an RPC, never a base table. Base tables are revoked. |
| Writes | An RPC for anything with a rule. Direct table writes only where a policy fully expresses the rule. |
| Errors | `raise exception '<snake_case_code>' using errcode = 'P0001'`. The code reaches the client in PostgREST's `message`, and the front end's data client wraps it into the one error shape in `actio-architecture`. Edge Functions return that shape directly. Copy belongs to `ux-writer`. |
| Pagination | Keyset on `(due, id)` for the queue. Never `offset`, because rows move while a reader pages. |
| Times | `timestamptz` throughout. The site time zone is its own labelled column, never inferred. |
| Enums | Postgres enum types, not check constraints on text, so the wire format and the schema cannot drift. |
| Embedding | Use PostgREST resource embedding rather than N round trips, but never across a boundary a policy protects. |

---

## Edge Functions

For what the database should not do: outbound messaging, provider webhooks, token minting,
anything with a secret.

Each lives at `supabase/functions/<name>/index.ts`. It is deployed with `deploy_edge_function`
and proved by calling its URL, base from `get_project_url`, with curl or a node fetch script,
reading `get_logs` for the same calls. There is no local Deno and no local serving, so a
function is only ever proved deployed on the dev project. An idempotency proof sends the same
request twice to the deployed function and counts the rows through `execute_sql`.

| Function | Rule |
|---|---|
| `send-invite` | Idempotent on `(employee, cycle, template, stage)`. Messaging is billed per message, so a retry that double-sends costs money as well as trust. |
| `webhook-delivery` | Idempotent on the provider's message id. Providers redeliver, routinely. |
| `survey-token` | The only place the signing secret is read. Never logs a token. |

All three: no personal data in a log line, no phone number in a URL, and a dead-letter row
rather than a silent drop. The secrets they read are set by Shehab in the dashboard, as the
Toolchain section says.

---

## pgTAP

The invariants get their own test file, and it reads as a specification rather than as
plumbing. This file is the product's claim, executable.

Every test file opens with `begin;` and ends with `rollback;`, and a file that needs rows it
does not find in the migrations inserts them itself inside that transaction. The same file
therefore proves the same thing in both places and leaves nothing behind:

| Where | How | Evidence |
|---|---|---|
| Offline | `node .actio/bin/db-test.mjs`, under the pgTAP-compatible shim | `evidence/backend/db-test-pglite.tap`, labelled PGlite |
| On the project | `execute_sql`, with the file's exact contents as the query, after a migration has enabled `pgtap` in the `extensions` schema | `evidence/backend/pgtap-project-<test file>.tap` |

Role and RLS checks switch role inside the transaction with `set local`, and switch back:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<employee uuid>","role":"authenticated"}';
-- assertions that must hold for this caller
reset role;
```

```sql
-- tests/invariants.test.sql
begin;
select plan(7);

-- I1
select is_empty(
  $$ select * from public.cohort_report('<cycle with 4 responses>', '{}'::jsonb) $$,
  'a cohort of four returns nothing'
);
select lives_ok(
  $$ select * from public.cohort_report('<cycle with 5 responses>', '{}'::jsonb) $$,
  'a cohort of five reports'
);

-- I2, and R-01: the refusal must not name the filter
select throws_ok(
  $$ select * from public.cohort_report('<cycle>', '{"shift":"night"}'::jsonb) $$,
  'P0001', 'below_threshold',
  'narrowing below the floor is refused, and the error names only the invariant'
);

-- I3: the rewording, read as the owner (the only reader is the security-definer function)
select is(
  (select free_text from public.response_feedback where id = '<response with a name>'),
  'the roster is late',
  'free text is returned reworded with names removed'
);
-- I3: the refusal, checked for the client role, never assumed (BUG-0029)
select ok(
  not has_table_privilege('authenticated', 'public.response_feedback', 'select'),
  'authenticated holds no privilege on the reworded view'
);

-- I4
select is_empty(
  $$ select * from public.issue_queue where id = '<protected case id>' $$,
  'a protected case never appears in the engagement queue'
);

-- the base tables are not reachable at all
set local role authenticated;
set local request.jwt.claims = '{"sub":"<employee uuid>","role":"authenticated"}';
select throws_ok(
  $$ select * from public.responses limit 1 $$,
  '42501',
  'authenticated has no direct grant on responses'
);
reset role;

select * from finish();
rollback;
```

Run on every change, offline and on the project. A change that touches a policy, a grant, a
view or a security-definer function and does not touch this file is a finding, because the
surface moved and nobody re-proved the claim.

---

## RLS traps

These are the ones that actually bite, and `code-analyst` checks every one.

| Trap | Why it hurts | Fix |
|---|---|---|
| `auth.uid()` called per row in a policy | It re-evaluates for every row, so a queue scan becomes thousands of calls | Wrap it: `(select auth.uid())`. Postgres then treats it as a constant for the scan. |
| A policy with a subquery on an unindexed column | Full scan per row | Index the column the policy filters on, always |
| `security definer` without `set search_path = ''` | A caller can shadow an object and run code as the definer | Pin it on every definer function, with every reference schema-qualified |
| A view without `security_invoker = on` | Runs as its creator, silently bypassing the caller's policies | Set it on every view over a protected table |
| A client grant on a `security_invoker` view whose base table is revoked | The caller needs a grant on every column the view reads, so the select fails with `42501` for every caller. The grant is inert, and it tempts someone to turn `security_invoker` off to "fix" it (BUG-0029) | Give no client grant; route clients through the security-definer function. To hide columns only, use column-level grants on the base table and a view over exactly those columns |
| RLS enabled but no policy | Denies everything, which looks like a bug and gets "fixed" by disabling RLS | Write the policy in the same migration that enables RLS |
| `service_role` in a client bundle | Bypasses every policy. A full breach. | It lives in Edge Function secrets and nowhere else. |
| A new table with no `enable row level security` | Open by default once granted | Every table, in the same file that creates it. No exceptions. |
| Policies written only for `select` | `insert`, `update` and `delete` default to denied, until someone grants broadly to fix it | Write all four explicitly, even where one is `false` |
| `using` without `with check` on an update policy | A row can be updated into a state the caller could not have selected | Always both |

`get_advisors` for type `security` catches several of these on the real project. It does not
replace the table: a clean advisor run with a bare `auth.uid()` in a policy is still a finding.

---

## Migrations

| Rule | |
|---|---|
| Hand-authored, one concern per file | `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql`. The timestamp comes from the shell, never invented: `node -e "console.log(new Date().toISOString().replace(/\D/g,'').slice(0,14))"`. The slug is snake_case and names the one concern. |
| Forward-only | Never edit a migration once it has been applied. A correction, including one a reviewer asks for, is a new migration. |
| A written reverse for every file | Written with the migration, recorded in the run's rollback notes at `.actio/runs/<run-id>/backend-engineer/rollback-notes.md`, saved beside them as `reverse-<slug>.sql`, and proved offline with `node .actio/bin/db-test.mjs --reverse <that file>`, which applies it to the migrated, seeded database and then re-applies the newest migration. It proves the newest migration's reverse only, so prove each reverse while its migration is still the newest. If it is ever needed it ships as a new forward migration. |
| Proved before it is applied | Green offline under db-test, and its contents run through `execute_sql` inside `begin; ... rollback;` on the project. Only then `apply_migration`, once. |
| Reviewed for lock behaviour | `supabase-postgres-best-practices` carries the lock rules. The lock each statement takes, and on which table, is recorded in the rollback notes. A rewrite on a live table is an outage. |
| Indexes built `concurrently` | On a table that already holds rows, and therefore outside a transaction block, in a migration of its own. `apply_migration` is reported to run each file inside a transaction, where `concurrently` fails, and the offline runner will not catch that, so until a concurrent build has been seen to apply on this project, one is a decision for Shehab before the apply: a plain `create index` with its write lock recorded in the rollback notes, or a window. Never drop `concurrently` quietly, and never run it through `execute_sql` instead, because SQL outside a migration file is never applied. An index on a new, empty table needs no concurrent build. |
| Three-step for a non-null column | Add nullable, backfill in batches, then set not null |
| Never a rename | Add, dual-write, backfill, stop reading, drop |
| Risky migrations proved at realistic size | Offline under PGlite with row counts the seed scales to, and in a rolled-back transaction on the project. A Supabase branch is optional and ask-first, because it costs money. No gate requires one. |
| Policies migrate with their table | A migration that adds a table and leaves its policy for later ships an open table |
| Applied, then verified | `list_migrations` shows every file by name, `list_tables` shows the tables and their RLS, `get_advisors` is clean for `security` and `performance` or every finding is accepted in writing, and `generate_typescript_types` has rewritten `web/src/lib/database.types.ts` |

---

## Before handing off

- [ ] Every new table has `enable row level security` in the same file that creates it
- [ ] Every base table holding response, cohort or protected data is revoked from `anon`
      and `authenticated`
- [ ] Every security-definer function pins `search_path` and schema-qualifies every reference
- [ ] Every view over protected data sets `security_invoker = on`
- [ ] No client role holds a grant on a `security_invoker` view over a revoked base table;
      where clients read a view directly, every column it reads is granted to them
- [ ] Every policy wraps `auth.uid()` in a scalar subquery
- [ ] Every column a policy filters on is indexed
- [ ] All four command policies written, even where one is `false`
- [ ] Every update policy has both `using` and `with check`
- [ ] `invariants.test.sql` covers every invariant this change touched, and passes offline
      (`db-test-pglite.tap`) and on the project (`pgtap-project-invariants.tap`)
- [ ] No `service_role` reference outside Edge Function secrets
- [ ] Every error raised by an invariant names the invariant and not the input
- [ ] Every migration is hand-authored in `supabase/migrations/`, has its reverse in the
      rollback notes, and was proved offline and in a rolled-back transaction on the project
      before `apply_migration`
- [ ] `list_migrations` shows every migration file by name, and `list_tables` output is saved
- [ ] `get_advisors` is clean for `security` and `performance`, or every finding is accepted
      in writing, with the output saved
- [ ] `web/src/lib/database.types.ts` was regenerated with `generate_typescript_types`
- [ ] Every Edge Function touched was deployed with `deploy_edge_function` and proved by a
      call to its URL, with the `get_logs` lines saved
- [ ] Every Edge Function secret and project setting the change needs is named in
      `decisions_for_shehab`, with no value written anywhere
- [ ] If the MCP was not connected, `status` is `blocked` with the reason
      `supabase MCP not authorised`, and the PGlite proof is attached
