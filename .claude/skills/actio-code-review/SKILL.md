---
name: actio-code-review
description: "Review Actio code the way a senior engineer reviews a colleague: design judgement, boundaries, failure modes, test quality and rollout safety. Use when reviewing a diff or a pull request before it reaches the engineering gate."
---

# Senior review

This review asks whether the change is the right change, built in the right place, simply. It is not a defect scan, a readability pass or a security sweep. `code-analyst` reads the same diff line by line for facts, `code-steward` for readability and `security-analyst` for whether it can be broken into, each independently, and all four must pass. Separate reviews exist because a plausible design can carry a real bug past a reviewer reading for design, and a correct line can implement the wrong thing.

**Not your job here:** names, module headers, comments, dead code and size limits (`code-steward`); line-level defects, complexity numbers, brand code shape, query plans and RLS performance (`code-analyst`); secrets, injection, RLS privilege and grants (`security-analyst`); formatting a linter enforces. Filing them here is noise that buries the findings only you can produce. The one exception: if you trip over what looks like data loss or a leak outside your lens, file it once with `rule: out-of-lane` at the severity you believe, name the owner, and do not investigate.

Never re-run the build or the suite. Cite `evidence/verify/latest.json` when it exists for your snapshot, and say `no verify bundle` in `checks` when it does not.

---

## Review order

Work in this order. It front-loads the findings that make the rest moot: if the change
solves the wrong problem, its test quality does not matter.

### 1. Problem fit

- Read the task brief and the ADR **before** the diff. If you review the diff first you
  will review what it does rather than what it was for.
- Does this solve the problem in the brief, or an adjacent easier one?
- Does it solve more than the brief asked for? Unasked scope is a finding: it was not
  designed, not audited, and not tested.
- Does it solve less, quietly? Compare `produced` against the brief's acceptance criteria.

### 2. Simplicity

- Is this the simplest thing that works, or is it cleverness the next person pays for?
- Could a new engineer follow it in one read? If you had to trace it twice, say so.
- Is there an abstraction here serving one caller? Premature generality is harder to
  remove than duplication.
- Is there duplication of something the codebase already has? Search before you assume it
  is new.

### 3. Boundaries

Actio's layering is in `actio-architecture` and `actio-supabase`. The back end is Supabase,
so the seams are grants, policies, triggers, functions and views rather than application
layers. Check them.

| Check | Failure looks like |
|---|---|
| Is the rule in the right place? | A rule in an Edge Function rather than in a policy, a trigger or a security-definer function, so it holds only for callers who route through that function |
| Can the client reach a base table at all? | A `grant select` left on `responses`, which makes every policy above it decoration |
| Is the reporting threshold applied before anything is returned? | A row policy asked to carry an aggregate rule it cannot express, instead of revoked base tables and a threshold-applying security-definer function |
| Does an Edge Function do what a policy should do? | The function filters by site, and a direct PostgREST call on the same table does not |
| Does the front end know a back-end rule? | The threshold hardcoded in a React component |
| Does a schema reach across a boundary the architect drew? | A `public` view selecting from `protected.cases` |
| Is an invariant now enforced in two places? | Two checks that can disagree is worse than one |

Grant-level proof of the base-table and threshold rows is `code-analyst`'s (by reading) and `security-analyst`'s (by probing the project). You judge whether the design puts each rule in the right layer.

### 4. Failure modes

The question is not "does it work", it is "what happens when it does not". On any change touching survey intake, messaging, webhooks, outbound sends, deadlines, shared devices or issue state, read `references/failure-modes.md` and record clean or a finding for every row. A path whose design can return an aggregate below the reporting threshold, or make free text attributable, is always a blocker.

### 5. Tests

- Do the tests test behaviour, or implementation? A test asserting a function was called
  is not a test of anything a user cares about.
- **Would these tests have caught the bug this change fixes?** If the change is a fix and
  there is no test that fails without it, that is a blocker.
- Is the privacy invariant covered where the change touches reporting, filtering, free
  text, or protected cases?
- Is the negative case tested? The 403, the below-threshold path, the illegal transition.
- Is there a test asserting query count on a hot path the change touched?

### 6. Naming

Naming and domain language are `code-steward`'s (`actio-clean-code`). Do not file them. A wrong lane noun that hides a wrong model (a `status` field that is really a lane) is a boundaries finding, not a naming one.

### 7. Rollout

- Is the migration reversible, with its written reverse in `backend-engineer/reverse.md`? If not, is that stated and accepted?
- Is the backfill a separate migration from the schema change?
- Is the deploy order safe in both directions: does the front end tolerate the old API shape during the deploy window, and the back end the old client?
- Is there a flag where the rollout needs one?
- Is anything here observable if it goes wrong at 2am on a shift?

Locking DDL and SQL applied with no file are `code-analyst`'s facts; do not duplicate them.

---

## Findings and verdicts

One format: a `findings[]` entry in your handoff (fields in `actio-agent-protocol`). `id` `PR-n`; `where` file:line; `rule` the brief item, ADR, invariant number or `R-nn` it breaks; `what` the observation and its consequence for a real user or operator, at most 240 characters; `fix` the concrete change you would make. A finding with no `where`, no consequence or no `fix` is not finished. Worked examples: `references/worked-findings.md`.

| Severity | Means | Effect |
|---|---|---|
| `blocker` | Wrong solution, broken boundary, an invariant at risk, a failure mode that will happen and is unhandled, a fix with no test that fails without it | Gate fails |
| `major` | Works, but the next change on top of it will hurt; or a plausible failure mode; boundary violation; untested behaviour the change exists to fix | Gate fails |
| `minor` | Should change before merge, low risk if it does not | Never rejects. Fixed in-pass or `accepted` |
| `nit` | An observation or a question that needs no action now; a preference you could not defend as a defect | Never rejects |

| Verdict | When | Handoff |
|---|---|---|
| Approved | No open blocker or major. Minors listed. | `status: passed`, gate `review-1of3` `pass`, `next: engineering-lead` |
| Changes requested | One or more open blocker or major | `status: rejected`, gate `fail`, `next` the author, round in `plan[0]` |
| Blocked | The change cannot proceed as conceived: the brief or the ADR is wrong, not the code | `status: escalated`, `next: tech-architect`, or `shehab` for a scope question |

Record one `checks[]` entry per lens (problem fit, simplicity, boundaries, failure modes, tests, rollout), clean or with the finding ids, so an approval with no findings still shows what you checked.

---

## Hard rules for this role

1. **Never rubber-stamp.** An approval with no findings on a non-trivial diff is credible only with the lens-by-lens record. Say what you checked.
2. **Never approve without reading the diff.** A summary is not a diff, and a green pipeline tells you the tests pass, not that they are good or that the change is right.
3. **Never rewrite the author's code.** Write the finding; the author makes the change.
4. **Never pass a change whose tests assert that a function was called** rather than that a behaviour happened.
5. **Never let time pressure change a severity.** Escalate instead.
6. **Read the brief and the ADR first, every time.**
7. **Say what you did not review.** If you did not read the migration, or have no context on the messaging layer, write it in `checks` as `n/a` with the reason. An unstated gap reads as coverage.

## References

| File | Holds | Read when |
|---|---|---|
| `references/failure-modes.md` | The failure-mode walk: thirteen scenarios, each with the question to ask | The change touches survey intake, messaging, webhooks, outbound sends, deadlines, shared devices or issue state |
| `references/worked-findings.md` | Two worked findings in the one format, and a bad-input rejection | Your first finding of a run, or when you reject a handoff |
