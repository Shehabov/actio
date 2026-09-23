---
name: actio-code-review
description: Review Actio code the way a senior engineer reviews a colleague: design judgement, boundaries, failure modes, test quality and rollout safety. Use when reviewing a diff or a pull request before it reaches the engineering gate.
---

# Senior review

This review asks whether the change is the right change, simply built. It is not a defect
scan. `code-analyst` reads the same diff line by line for facts, `code-steward` for
readability and `security-analyst` for security, each independently, and all four must
pass. Separate reviews exist because a plausible design can carry a real bug past a
reviewer who is reading for design, and a correct line can implement the wrong thing.

**Not your job here:** formatting, import order, naming conventions a linter enforces,
line-level bugs, security scanning. Those belong to the formatter, the linter,
`code-analyst` or `security-analyst`. Filing them here is noise that buries the findings only you can produce.

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

### 4. Failure modes

The question is not "does it work", it is "what happens when it does not". Walk this list
against the change. Actio's operating conditions make several of these routine rather
than exotic.

| Scenario | Ask |
|---|---|
| A caller skips the Edge Function and calls PostgREST directly | Is the rule in a policy, a trigger or a security-definer function, so it still holds? A rule that only an Edge Function applies is bypassed by a client that has the anon key and the table name. |
| The anon key leaks | It is public by design. What does a holder of it reach? Every answer to that should be a revoke or a policy, not an assumption about the client. |
| Connection drops mid-survey | Are the answers on the device? Do they send on reconnect? Do they double-send? |
| Duplicate webhook | Providers redeliver routinely. Is this idempotent on the provider's message id? |
| Retried outbound message | Billing is per message. Does a retry send twice and charge twice? |
| Shared handset | Does anything persist per account that should persist per device? Is the previous reader's data still on screen? |
| Clock skew, DST, site time zone | Is a deadline computed in the site's zone or the server's? Does a shift boundary land correctly? |
| Partial write | If this fails halfway, is the state legal? Is there a transaction boundary? |
| Cohort changes between two reads | The preview said 23, submission sees 22. What does the reader see? |
| Longest locale | Does the layout hold at Tagalog, not just English? |
| RTL | Does anything use a physical property that should be logical? |
| Empty and dense | Zero issues, and forty. Both are normal. |
| Below threshold | Does it degrade, or does it error and strand the reader? |

### 5. Tests

- Do the tests test behaviour, or implementation? A test asserting a function was called
  is not a test of anything a user cares about.
- **Would these tests have caught the bug this change fixes?** If the change is a fix and
  there is no test that fails without it, that is a blocker.
- Is the privacy invariant covered where the change touches reporting, filtering, free
  text, or protected cases?
- Is the negative case tested? The 403, the below-threshold path, the illegal transition.
- Is there a test asserting query count on a hot path the change touched?

### 6. Naming and domain language

- Does the code read in the product's language: issue, owner, lane, evidence, cycle,
  cohort, closure? Or in generic CRUD nouns: item, status, record, data, handler?
- A name that needs a comment to explain it is a naming finding, not a comment finding.
- Is a boolean named for what it is, not what it does? `is_closed` over `check_closed`.

### 7. Rollout

- Is the migration reversible? If not, is that stated?
- Does the migration lock a live table?
- Is there a flag where the rollout needs one?
- Does the front end tolerate the old API shape during the deploy window, and the back end
  the old client?
- Is anything here observable if it goes wrong at 2am on a shift?
- Any secret, any debug code, any commented-out block?

---

## Comment format

Anchored to file and line. Severity, the problem, and a concrete suggested change. A
comment that describes a feeling is not actionable.

```markdown
### web/src/lib/issues/close.ts:42 · Blocker

Closure writes the `Closure` record in a separate PostgREST call from the one that saves the
status, so the two share no transaction. If the insert fails, the issue reads closed with no
audit record, which is the one state I7 says cannot exist.

Suggested: move both writes into one database function, called once through `rpc`, and add
a pgTAP test that forces the insert to fail and asserts the status did not move.
```

```markdown
### web/components/PrivacyPreview.tsx:18 · Major

`const THRESHOLD = 5` hardcodes a server invariant in the client. When an organisation
raises its threshold this screen will state a number the server does not honour, on the
one screen whose entire job is to be verifiable.

Suggested: take it from the endpoint response, which already returns `reporting_threshold`.
```

| Severity | Means |
|---|---|
| **Blocker** | Wrong solution, broken boundary, an invariant at risk, or a failure mode that will happen and is unhandled. Gate fails. |
| **Major** | Works, but the next change on top of it will hurt. Or a failure mode that is plausible rather than certain. Gate fails. |
| **Minor** | Worth fixing, does not hold the gate. Say so explicitly so nobody guesses. |
| **Question** | You do not understand something. Ask. A question is not a finding and does not hold the gate on its own. |

`peer-reviewer` writes each comment to `comments.md` in the What, Why, Suggested and Rule
block set out in its agent file, and uses `note` for an observation that needs no action.
The content is the one described here; the agent file's form is the one written.

---

## Verdicts

| Verdict | When | Handoff |
|---|---|---|
| `approved` | No blocker, no major. Minors listed. | `status: passed`, gate `review-1of3` result `pass`, `next` is `bug-historian` for the regression guard |
| `changes_requested` | One or more blocker or major | `status: rejected`, `needs` the author, round number |
| `blocked` | The change cannot proceed as conceived. The brief or the ADR is wrong, not the code. | `status: escalated`, route to `tech-architect` or Shehab |

---

## Hard rules for this role

1. **Never rubber-stamp.** An approval with no comments on a non-trivial diff means you
   did not review it. Say what you checked, even when you found nothing.
2. **Never rewrite the author's code.** Suggest the change; the author makes it. Writing
   it yourself removes the second pair of eyes you were brought in to be.
3. **Never file style opinions a formatter owns.** They dilute the findings that matter.
4. **Never approve on a green pipeline.** The pipeline tells you the tests pass. It does
   not tell you the tests are good, and it cannot tell you the change is right.
5. **Read the brief first.** Every time.
6. **Say what you did not review.** If you did not read the migration, or you have no
   context on the messaging layer, write it down. An unstated gap reads as coverage.
7. **Three rounds is the limit.** On the third round with the same author on the same
   change, escalate. A loop that has not converged is a disagreement, not a
   misunderstanding.
