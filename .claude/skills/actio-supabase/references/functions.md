# The state machine, RPCs and PostgREST conventions

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before writing a transition trigger, an RPC, an error code or a paginated read.

## I5 to I7: the state machine

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
neither is bypassable from a client. The legal-transition table is also backed by a check
constraint, and `transition()` is the one RPC that takes the target state and evidence, reads
the actor from `(select auth.uid())`, and does `select ... for update` on the row and writes
a transition-log row per change, all in one transaction.

## PostgREST conventions

PostgREST replaces DRF. The contract lives in `actio-architecture` and does not change
shape; only the transport does.

| Concern | Convention |
|---|---|
| Reads | A view or an RPC, never a base table. Base tables are revoked. A view shapes a read and holds no business branching. |
| Writes | An RPC for anything with a rule. Direct table writes only where a policy fully expresses the rule. |
| Errors | `raise exception '<snake_case_code>' using errcode = 'P0001'`. The code reaches the client in PostgREST's `message`, and the front end's data client wraps it into the one error shape in `actio-architecture`. Edge Functions return that shape directly. Copy belongs to `ux-writer`. |
| Pagination | Keyset on `(due, id)` for the queue. Never `offset`, because rows move while a reader pages. |
| Times | `timestamptz` throughout. The site time zone is its own labelled column, never inferred. |
| Enums | Postgres enum types, not check constraints on text, so the wire format and the schema cannot drift. |
| Embedding | Use PostgREST resource embedding rather than N round trips, but never across a boundary a policy protects. |
