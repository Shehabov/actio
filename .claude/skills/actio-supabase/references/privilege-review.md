# Privilege review: the RLS, grant, view and definer checks

For `code-analyst` and `security-analyst`, and for `backend-engineer`'s self-check. Each query lists the objects that break one rule, so a healthy schema returns no rows (P10 is a map you read against the design). They read the catalogue only: run them on PGlite (inside a test file under `node .actio/bin/db-test.mjs`) and on the project through `execute_sql`, and save the output under `evidence/`. Proved on 2026-10-07 on a fixture with one planted defect per query and a healthy twin: each fires on its defect and is silent on the healthy object. Extend `('public', 'protected')` to any other exposed schema.

Why: default privileges give `anon` and `authenticated` every object nobody revoked, and a new function is executable by public. A missing revoke is in no migration line; it shows in the catalogue.

## Catalogue (each returns a column `x`)

P1, a table with RLS off:
```sql P1
select c.relname::text as x from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname in ('public', 'protected') and c.relkind in ('r', 'p') and not c.relrowsecurity
```
P2, RLS on and no policy:
```sql P2
select c.relname::text as x from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname in ('public', 'protected') and c.relkind in ('r', 'p') and c.relrowsecurity
   and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
```
P3, a table missing one of the four command policies:
```sql P3
select c.relname::text as x from pg_class c join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
 where n.nspname in ('public', 'protected') and c.relkind in ('r', 'p') and c.relrowsecurity
 group by c.relname
having not (coalesce(bool_or(p.polcmd = '*'), false)
            or count(distinct p.polcmd) filter (where p.polcmd in ('r', 'a', 'w', 'd')) = 4)
```
P4, an update policy with no `with check`:
```sql P4
select p.polname::text as x from pg_policy p where p.polcmd in ('w', '*') and p.polwithcheck is null
```
P5, a bare `auth.uid()` in a policy:
```sql P5
select p.polname::text as x from pg_policy p
 where concat_ws(' ', pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)) ~ '(?<!SELECT )auth\.uid\(\)'
```
P6, a definer function whose `search_path` is not pinned empty:
```sql P6
select p.proname::text as x from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'protected') and p.prosecdef and not coalesce('search_path=""' = any(p.proconfig), false)
```
P7, a definer function `anon` can execute (a grant to `authenticated` alone leaves it):
```sql P7
select p.proname::text as x from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'protected') and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
```
P8, a view without `security_invoker`:
```sql P8
select c.relname::text as x from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname in ('public', 'protected') and c.relkind = 'v'
   and not coalesce(array_to_string(c.reloptions, ',') ~* 'security_invoker=(on|true|yes|1)', false)
```
P9, an inert grant: a client can select a `security_invoker` view whose base table it cannot read. Remove it:
```sql P9
select distinct v.relname::text || ' ' || r.rolname as x
  from pg_class v join pg_namespace n on n.oid = v.relnamespace
  join pg_rewrite rw on rw.ev_class = v.oid
  join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid and d.refclassid = 'pg_class'::regclass
  join pg_class t on t.oid = d.refobjid and t.oid <> v.oid and t.relkind in ('r', 'p')
  cross join (values ('anon'), ('authenticated')) r(rolname)
 where n.nspname = 'public' and v.relkind = 'v'
   and coalesce(array_to_string(v.reloptions, ',') ~* 'security_invoker=(on|true|yes|1)', false)
   and has_table_privilege(r.rolname, v.oid, 'select') and not has_any_column_privilege(r.rolname, t.oid, 'select')
```
P10, every `public` object a client role can touch, to read against the design (response, cohort and protected data must be absent):
```sql P10
select c.relname::text || ' ' || r.rolname as x
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) r(rolname)
 where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
   and (has_table_privilege(r.rolname, c.oid, 'select,insert,update,delete')
        or has_any_column_privilege(r.rolname, c.oid, 'select,insert,update'))
```
P11, a client role with usage on the protected schema:
```sql P11
select r.rolname::text as x from (values ('anon'), ('authenticated')) r(rolname) where has_schema_privilege(r.rolname, 'protected', 'usage')
```

## Refusals and grants

A refusal is proved by the privilege, never by a select that failed with `42501`: a view with an inert grant and one with no grant refuse with the same code. A grant is proved by reading as the grantee. Per object, real names:
```sql
select has_table_privilege('authenticated', 'public.responses', 'select');  -- false; also anon, and every view over it
set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
select id, display_name from public.member_directory limit 1;               -- a granted read returns rows
reset role;
```

## Read the diff for what no query sees

1. Every definer: references schema-qualified, no `execute format(...)` from caller input, every `raise` names the invariant, never an input.
2. Every grant: none to `anon` on protected data, no `grant all` or `on all tables in schema`, no `alter default privileges ... grant`, each exercised by a test as its grantee.
3. Every policy: no `using (true)` on response or protected data, a `to` clause, update `using` and `with check` agreeing in meaning, predicate columns indexed.
4. A view that transforms a column is never client-granted; `service_role` only in Edge Function secrets; `pg_cron`, Realtime and exports reach data through the same revoked tables or definers.
5. A policy, grant, view or definer change that leaves `invariants.test.sql` untouched, or a refusal proved by `42501` alone, is a finding.
