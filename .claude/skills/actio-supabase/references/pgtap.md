# pgTAP: the invariants as an executable specification

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before writing or changing any `supabase/tests/*.test.sql` file.

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
