# The invariant suite and the RLS matrix: where they live, the SQL example

Read when: you write, run or review the privacy suite, or whenever a policy, a grant, a view or a security-definer function changes.

### Where they live

`supabase/tests/invariants.test.sql`, pgTAP, run on every change two ways: on the Supabase
project through `execute_sql`, wrapped as `begin; ... rollback;`, with pgTAP enabled by a
migration (`create extension if not exists pgtap with schema extensions`), and offline with
`npm run db:test` in PGlite. Both outputs are saved under `evidence/`, each labelled with
where it ran. The file reads as a specification rather than as plumbing, because it is the
product's claim made executable.

```sql
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

-- I2: the refusal must not name the filter
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
-- I3: the refusal, checked for the client role, never assumed
select ok(
  not has_table_privilege('authenticated', 'public.response_feedback', 'select'),
  'authenticated holds no privilege on the reworded view'
);

-- I4
select is_empty(
  $$ select * from public.issue_queue where id = '<protected case id>' $$,
  'a protected case never appears in the engagement queue'
);

-- the revoke itself, under the caller's role and claims, inside this transaction
set local role authenticated;
set local request.jwt.claims = '{"sub": "<respondent id>", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.responses limit 1 $$,
  '42501',
  'authenticated has no direct grant on responses'
);
reset role;

select * from finish();
rollback;
```

**A change that touches a policy, a grant, a view or a security-definer function and does
not touch this file is a finding.** The surface moved and nobody re-proved the claim.

### The RLS matrix

Separate from the cases above, and run whenever a policy or a grant changes. Every table,
every role, every command, positive and negative.

| | `anon` | `respondent` | `team_lead` | `operations` | `leadership` | `protected_handler` |
|---|---|---|---|---|---|---|
| `responses` | deny | deny (own answers only through a security-definer function) | deny | deny | deny | deny |
| `cohorts` | deny | deny | deny | deny | deny | deny |
| `issues` | deny | deny | own lane | own site | all | deny |
| `evidence` | deny | deny | own lane | own site | all | deny |
| `protected.cases` | deny | deny | deny | deny | deny | allow |

A cell reading `deny` is tested twice, never assumed: the grant question with `has_table_privilege` returning false, and the data question with a select that returns `42501` or an empty set. A refused select alone passes an inert grant.
A cell reading a scope is tested twice: once inside the scope expecting rows, once outside
expecting none. Each cell runs on the project through `execute_sql`, inside
`begin; ... rollback;`, as `set local role anon` or `set local role authenticated` with
`set local request.jwt.claims` naming a user who holds that row's role.
