# Clean-code examples

The code examples moved verbatim out of the old `actio-clean-code` SKILL.md, so the rules stay in the preloaded skill and the worked code is read only when needed. Read when you write your first header, docstring or policy finding of a run and need the bar, when you are unsure whether a comment earns its space, or when an author disputes a finding and you need the reason (the last section).

## Guard clauses over nesting

```ts
// Nested: the reader carries three conditions to reach the point
function close(issue: Issue, by: UserId, at: Date) {
  if (issue.status !== 'closed') {
    if (issue.evidence.length > 0) {
      if (issue.owner !== null) {
        // ...
      }
    }
  }
}

// Guarded: each rule is stated once and the point is at the left margin
function close(issue: Issue, by: UserId, at: Date) {
  if (issue.status === 'closed') throw new AlreadyClosed()
  if (issue.evidence.length === 0) throw new EvidenceRequired()
  if (issue.owner === null) throw new OwnerRequired()
  // ...
}
```

## No flag arguments

```ts
// The call site reads close(issue, true) and tells the reader nothing
function close(issue: Issue, force = false) { /* ... */ }

// Two honest names
function close(issue: Issue) { /* ... */ }
function forceClose(issue: Issue, overrideReason: string) { /* ... */ }
```

## A comment that is noise, and one that earns its space

```ts
// Noise. Delete it.
// increment the counter
counter += 1

// Worth its space. Nothing in the code can carry this.
// Cohort size is recomputed here rather than cached, because the privacy preview
// promises the reader a live figure. A stale number would be a claim rather than
// a disclosure, which is the thing this screen exists to avoid.
const size = await countResponses(cohortId)
```

## A module header

```sql
-- 05_functions.sql · the reporting surface for survey cohorts.
--
-- I1 and I2. RLS is row-level and the threshold is a property of the SET, so no
-- row policy can express it. The base tables are revoked from anon and
-- authenticated in 07_grants.sql, and every callable here is the only granted
-- path to response data. Each one applies the floor before it returns anything.
--
-- Every function here is security definer with search_path pinned to ''. An
-- unpinned search_path lets a caller shadow an object and run their own code as
-- the definer, which on this surface is the whole database.
--
-- Never add a function here that takes a pre-built query or a raw table name
-- from outside this file.
```

## A docstring on a function that is not self-evident

```sql
-- Cohorts large enough to report on for this organisation.
--
-- The organisation may raise its threshold, never lower it: greatest(5, ...) is
-- the floor and it is deliberate. Returns an empty set rather than raising when
-- nothing qualifies, because a caller rendering a report needs a page, not an
-- exception. Raising is reserved for I2, where the refusal is the answer.
create or replace function public.reportable_cohorts(p_org uuid)
returns setof public.cohorts
language sql
stable
security definer
set search_path = ''
as $$ ... $$;
```

## A policy comment

```sql
-- I4. Protected cases live in their own schema with their own grant rather than
-- behind a flag on issues, because a flag can be forgotten in a where clause and
-- a missing grant cannot.
create policy case_handler_only on protected.cases
  for select to protected_handler
  using ( exists (
    select 1 from protected.handlers h
     where h.user_id = (select auth.uid())
       and h.organisation_id = protected.cases.organisation_id ) );

## Why the standard is shaped this way here

Moved verbatim from the old SKILL.md, where it sat as "Structure that helps the next model".

Specific to this repository, and the reason `code-steward` exists rather than leaving this
to `peer-reviewer`.

| Practice | Why it matters here |
|---|---|
| Module header states the invariants the module upholds | A model handed one file has no repository context. The header supplies it. |
| Domain terms used exactly as the architecture defines them | `issue`, `lane`, `owner`, `evidence`, `cohort`, `closure`. Consistent vocabulary lets a reader match code to the ADR without a translation step. |
| The dangerous path is loud, not documented | A default manager returning `none()` beats a comment saying "remember to filter". Make the wrong thing fail rather than warning against it. |
| Invariants cited by number in the code | `-- I5` next to the evidence check ties the line to `actio-architecture` |
| One way to do each thing | Two patterns for one job forces every reader to work out which is current |
| Tests read as specifications | `test_cohort_of_four_never_reports` tells a reader the rule. `test_reporting_1` tells them nothing. |
| No cleverness without a comment earning it | A clever line that saves four lines and costs ten minutes of reading is a bad trade |
