---
name: actio-code-analysis
description: Analyse Actio code line by line for defects, security issues, data-layer problems and structural rot. Use when scanning a diff for bugs, checking complexity and duplication, or hunting spaghetti code before the engineering gate.
---

# Code analysis

Read the diff line by line for facts: a defect is true or false regardless of taste. `peer-reviewer` reads the same diff for judgement, `code-steward` for readability and `security-analyst` for whether it can be broken into, each independently, and all four must pass.

**Not your job:** whether this is the right solution, layering, the failure-mode walk, test adequacy, rollout and reversibility (`peer-reviewer`); names, headers, comments, dead code, function and file length, parameters, flag arguments, duplication (`code-steward`); injection, missing authorisation, secrets, RLS privilege, advisors (`security-analyst`, whose rows are in `actio-security/references/code-level-security.md`); anything a formatter or linter enforces.

---

## 1. Correctness

| Hunt for | Signature |
|---|---|
| Off by one | `<=` where `<` was meant, a keyset boundary that repeats or skips a row, threshold arithmetic using `>` where `>=` was meant |
| Null and undefined paths | A value that can be `None` or `undefined` reaching an attribute access or a method call unchecked |
| Unhandled promise rejection | An `async` call with no `await` and no `.catch`, a floating promise in an effect |
| Swallowed exception | An empty `catch`, an `exception when others then null` block, a `try` that logs and continues into an invalid state |
| Wrong boolean logic | De Morgan errors, `and`/`or` precedence, a negated condition that reads correctly but is not |
| Wrong comparison | `==` on floats, identity where equality was meant, string comparison of numbers |
| Timezone and DST | `timestamp` where `timestamptz` was meant, date arithmetic across a DST boundary, a deadline rendered in the server zone rather than the site zone |
| Money as float | Currency as `float` or `real`. Actio quotes `Rp 2.450.000`. Use `numeric` or minor units as `bigint`. |
| Race condition | Read then write without a lock or a transaction, check-then-act, two requests both passing a uniqueness check, an upsert used as a lock, a counter incremented in the client instead of in SQL |
| Mutation of shared state | A module-level mutable in an Edge Function reused across invocations, a React state object mutated in place |
| Unawaited async | A promise created and dropped in an Edge Function, so the runtime freezes before it settles |
| Incorrect early return | A guard that returns before a required side effect |

## 2. Security

Not filed here. `security-analyst` owns it. The two exceptions, double-owned on purpose, are in section 7.

## 3. Data layer

| Hunt for | Signature |
|---|---|
| N+1 | A query per row in a loop where PostgREST resource embedding would do it once |
| Missing index | A filter, sort or **policy predicate** on an unindexed column, especially the queue's `(site, status, due)` |
| Unbounded read | A PostgREST call with no `limit` and no keyset range |
| Offset pagination | `offset` on a queue. Rows move while a reader pages, so they see duplicates and gaps. Keyset on `(due, id)`. |
| Missing transaction | Two writes that must both happen, not wrapped in a function |
| Locking migration | `alter table` rewriting a large live table, an index built without `concurrently` |
| Migration outside the source of record | Migrations are hand-authored in `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql`, forward-only, one concern per file. The finding is SQL applied to the project that has no file (`list_migrations` shows a name with no file), a file edited after it was applied, a file carrying more than one concern, or a change made only in a `supabase/schemas/` file. There is no declarative schema workflow: it needs `supabase db diff`, and the Supabase CLI and Docker are not used, so a schema file is not a source of record. |
| `count(*)` in a loop | One aggregate, not one per row |

A migration with no written reverse in `reverse.md` and no stated reason at the head of the file is a finding here; whether the reverse is sound, and the backfill split, are `peer-reviewer`'s rollout lens.

## 3a. Row Level Security: performance

Privilege rows (`search_path`, `security_invoker`, RLS on and policies per command, `with check`, base-table grants, `service_role`) are `security-analyst`'s. You own the cost of a policy.

| Hunt for | Why it hurts | Fix |
|---|---|---|
| `auth.uid()` called bare in a policy | It re-evaluates per row, so a queue scan becomes thousands of calls | `(select auth.uid())`, which Postgres treats as a constant for the scan |
| A policy predicate calling a volatile function | Re-evaluated per row, and can leak timing | Mark the function `stable` and index what it reads |
## 4. Concurrency and async

- Shared mutable state across requests.
- A React effect with a missing or over-broad dependency array.
- A React effect deriving state that could be computed during render.
- A cleanup function missing on a subscription or a timer.

Background-task idempotency, retry caps and outbound-send idempotency keys are `peer-reviewer`'s failure-mode walk.

## 5. Error handling

- An error body that carries prose instead of a code. Copy belongs to `ux-writer`.
- A caught error that returns a success shape.
- A user-facing failure that blames the reader. `Could not send` is correct; `you entered
  an invalid number` is not.

Leaks of internals to the client and absent observability are `security-analyst`'s (G1, G2).

## 6. Structural rot

Measured, not felt: report the number. Size thresholds and named smells are `code-steward`'s reading-cost checks (`references/structural-smells.md`).

| Metric | Threshold | Finding |
|---|---|---|
| Cyclomatic complexity | > 10 | Extract the branches, or invert the guards |
| Nesting depth | > 3 | Guard clauses and early returns |
| Circular import | any | `a` imports `b` imports `a`. The shared thing belongs in a third module |

---

## 7. Actio-specific defects

These are the ones a general-purpose scan will never find. Check every one on any diff
that touches UI, reporting, or the issue lifecycle.

| Defect | Why it matters |
|---|---|
| A hardcoded hex, spacing value, radius or duration | Tokens come from `BRAND.md`. A literal is drift. |
| A spacing value of 14, 18, 20 or 30 | Those do not exist in this product |
| A number rendered outside Plex Mono, or a numeric column without tabular figures | Every number is instrumentation |
| A percentage rendered without its sample size | Contradicts the product's own argument |
| A status rendered by colour with no written label | Fails for deuteranopia, and it is a brand rule |
| White text on a Vega fill | 2.27:1. Measured. Fails. |
| A grant on a base table holding response or cohort data | I1. RLS is row-level; the threshold is an aggregate property. The only safe path is revoked tables plus a threshold-applying security-definer function. |
| A filter validated client side only, or a below-threshold error naming the filter | I2. The error names the invariant, never the input. |
| A protected case reachable from an engagement query, or protected data as a flag on `issues` rather than a separate schema | I4 |
| A close path with no evidence check, or the guard written as a policy rather than a before-update trigger | I5. The product's entire claim. |
| An assignment with no lane-authority check | I6 |
| A deadline rendered in the reader's time zone | I8 |
| A string concatenated with a count | Breaks Indonesian and Tagalog plurals |
| A physical CSS property where a logical one belongs | Breaks RTL |
| A font loaded from a public CDN | A blocked request is an unreadable survey |
| `.from('cohorts').select()` or any other direct client read of reportable data | The base table is revoked for a reason. The only read path is the threshold-applying function. |
| A reporting query, export, sort or aggregate that can return a group below the minimum, or a filter that narrows past it | I1, I2. A blocker, always. |

**Double-owned on purpose with `security-analyst`, who probes the project:** the threshold leak (I1, I2), a close with no evidence (I5) and a grant on a base table holding response, cohort or protected data. A miss on these is unrecoverable, so both of you check. Do not soften yours because the other passed.

Severity and citation for the UI facts. Read the cited `BRAND.md` section before you cite it and never quote a token value from memory:

| Fact | Severity | Cite |
|---|---|---|
| Hardcoded hex, px, duration or `cubic-bezier` outside the token layer; spacing 14, 18, 20 or 30 | `major` | `BRAND.md` §1.5 |
| A number, count, date, case id or currency outside Plex Mono | `major` | §3 |
| A percentage with no sample size | `major` | §5 |
| A string concatenated with a count | `major` | §8 |
| Physical CSS in a shared style | `major` | §7.3 |
| A font from a public CDN | `blocker` | §3 |

For any other row above (a status by colour alone, white text on a Vega fill), find the section in `BRAND.md` by grep, read it, then cite it.

---

## Findings

One format: a `findings[]` entry in your handoff (`actio-agent-protocol`). `id` `CA-n`; `where` file:line; `rule` the class (`correctness`, `data`, `structure`, `I1`, `BRAND.md §3`); `what` the defect and why it is wrong, at most 240 characters; `fix` concrete enough to apply without asking what you meant; `evidence` an optional path under `evidence/code-analyst/` holding the quoted lines. Rank by severity. No padding with style opinions.

```json
{"id":"CA-1","severity":"blocker","where":"web/src/lib/issues/close.ts:61","rule":"I7","evidence":"evidence/code-analyst/close-ts-61.txt","what":"closeIssue() updates issues then inserts the Closure in two calls with no shared transaction. If the insert fails the issue reads closed with no audit record, silently.","fix":"One public.close_issue function called once through rpc, plus a pgTAP test that forces the insert to fail and asserts the status is unchanged.","status":"open"}
```

| Severity | Means | Effect |
|---|---|---|
| `blocker` | Data loss, a broken invariant, a threshold leak, a close without evidence, or a defect that will fire in normal use | Gate fails |
| `major` | A real defect on a reachable but non-routine path, a complexity or nesting breach, the UI facts above | Gate fails |
| `minor` | A latent problem or a smell below threshold | Never rejects |
| `nit` | Suspected but not reproduced, labelled `Suspected:`. Inference is a question, not a finding | Never rejects |

The retired S1, S2 and S3 labels map to `blocker`, `major` and `minor`.

---

## Method

1. Read the brief and the ADR: without them you cannot tell a defect from a decision.
2. `git diff <base> <snapshot>`. Read every changed file in full and each callee outside the diff. Find callers by grep, never by guess.
3. Work sections 1 to 7 in order.
4. Prove each finding: trace the path or write the failing case, and quote the lines in `evidence/code-analyst/`. One you cannot reproduce is a `nit` labelled `Suspected:`.
5. Read tool output, never the exit code. Typecheck, lint and tests: cite `evidence/verify/latest.json`, never re-run. Query plans: `EXPLAIN` through `execute_sql` as `begin; ... rollback;` under `set local role authenticated` and `set local request.jwt.claims`, because a plan read as the owner skips the policy. Performance advisor: `evidence/security/advisors-performance.json` for your snapshot when it exists, else one `get_advisors` call of type `performance`. Read-only: never `apply_migration`, `deploy_edge_function` or a branch tool.
6. Gate `review-2of3`: any open blocker or major fails it.

## References

| File | Holds | Read when |
|---|---|---|
| `references/structural-smells.md` | The size thresholds and named smells with the refactor that resolves each, `code-steward`'s to file | A complexity, nesting or circular-import breach needs a named refactor, or a smell blocks a defect you are proving |
