# I1 to I4 as policies: the threshold, rewording and protected cases

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before writing or reviewing any policy, grant, view or security-definer function. The doctrine and the must-have proofs stay in the core skill; the checks a reviewer runs are in `privilege-review.md`.

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
