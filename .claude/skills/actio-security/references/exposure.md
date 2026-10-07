# Exposure and configuration (F1 to F3)

Moved verbatim from the old `actio-security` SKILL.md, section F. Read on every pass (the F1 queries and role-switched probes are step 4 of the method) and before any release. Run the queries and probes through `execute_sql`, one per call, and save each call and its returned rows to `evidence/security/`. For RLS privilege shapes and the policy traps, also read `.claude/skills/actio-supabase/references/privilege-review.md` when the diff touches `supabase/`.

## F. Exposure and configuration

The class that produces the headline breaches, and the one most specific to this stack.

### F1. Open database endpoints · Critical

**A Supabase project with RLS off is a public database**, because PostgREST exposes every
granted table and the anon key is in the browser by design. This is the single most common
way a product of this shape leaks everything.

Run each query on the project through `execute_sql`, and save the call and its returned rows.

```sql
-- every table in a client-reachable schema must have RLS on
select schemaname, tablename, rowsecurity
  from pg_tables
 where schemaname in ('public')
   and rowsecurity = false;

-- and RLS on with no policy is deny-all, which gets "fixed" the wrong way
select c.relname
  from pg_class c
 where c.relrowsecurity
   and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
```

Then prove it from the caller's side. A query that reads the catalogue shows the setting; a
probe under the caller's role shows the effect. One probe per `execute_sql` call:

```sql
begin;
set local role anon;
select count(*) from public.responses;   -- expected: 42501, insufficient privilege
rollback;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "<team lead on site A>", "role": "authenticated"}';
select count(*) from public.issues where site_id = '<site B>';   -- expected: 0
rollback;
```

Run `get_advisors` for type `security` and type `performance` on every build and treat
every finding as a defect.

### F2. Misconfigured storage buckets · Critical

The Firebase-bucket failure mode, in Supabase Storage form.

- No bucket is public unless the content is genuinely public. Evidence attached to an issue
  is never public.
- Every bucket has storage policies, and they are tested the same way table policies are:
  `select id, public from storage.buckets;` through `execute_sql`, then role-switched probes
  on `storage.objects`.
- Signed URLs are short-lived and scoped to one object.
- A file name is not a secret. Never rely on an unguessable path.

### F3. Environment and configuration · High

- No secret in a client-side environment variable. Anything prefixed for the browser is
  public: `NEXT_PUBLIC_*` is shipped to every visitor.
- CORS is an allowlist, never `*`, on anything authenticated.
- Debug and verbose error modes off in production, because a stack trace is a map.
- Default credentials changed, sample data removed, seed accounts disabled.
