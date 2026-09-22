---
name: actio-test-protocol
description: Plan, run and evidence testing for Actio: API contract, privacy invariants, state machine, product flows, accessibility, locales and regression. Use when testing any change, reviewing a test log, or deciding release readiness.
---

# Test protocol

Shared by `qc-engineer`, who tests and produces evidence, and `qc-lead`, who audits that
evidence and decides go or no-go.

**A test that cannot be evidenced did not run.** Command output, response bodies,
screenshots and traces go under `.actio/runs/<run-id>/evidence/` and are referenced by
path from the handoff.

---

## Test plan template

Written before testing starts, at `.actio/runs/<run-id>/qc-engineer/plan.md`, the same file
that carries the step 2 audit.

```markdown
# Test plan · 2026-09-20-privacy-preview

**Change under test.** New privacy preview endpoint and screen.
**Briefs.** tech-architect/brief-backend.md, brief-frontend.md
**Invariants in scope.** I1, I2, I3
**Declared untestable this run.** Tagalog on a physical handset, no device available.

| # | Surface | Case | Expected | Evidence |
|---|---|---|---|---|
| 1 | API | GET preview, cohort 23 | 200, live figures, below_threshold false | `evidence/api-preview-200.json` |
| 2 | API | GET preview, cohort 4 | 200, below_threshold true, no error | `evidence/api-preview-below.json` |
| 3 | API | GET preview with a manager token | 403 | `evidence/api-preview-403.txt` |
| 4 | Privacy | Cohort of 4 never appears in a report | absent | `evidence/inv-i1.log` |
...
```

---

## The surface matrix

Every change is tested across all six. "Covered" has a specific meaning in each.

| Surface | Covered means |
|---|---|
| **API contract** | Every endpoint the change touches, every status code in the brief, every error shape, both the happy path and the negative case |
| **Privacy invariants** | All four of I1 to I4 exercised, not reasoned about, on the paths this change touches |
| **State machine** | Every legal transition attempted and allowed, every illegal one attempted and refused |
| **Product flows** | The flows a real user runs, end to end, on a phone |
| **Cross-cutting** | Both themes, four locales, RTL, 360px, 200% zoom, keyboard, screen reader, reduced motion, offline and reconnect, slow connection |
| **Regression** | Everything the engineering lead flagged as touched |

---

## 1. API contract

For every endpoint the change touches:

- [ ] Response shape matches the brief exactly. Compare field by field, not by eye.
- [ ] Every status code in the brief produced deliberately.
- [ ] Error bodies carry a code, not prose.
- [ ] Authentication: no token gives 401.
- [ ] **Authorisation: the wrong token gives 403.** Every endpoint. This is the one that
      gets skipped.
- [ ] Pagination: first page, a middle page, the last page, an empty set.
- [ ] Validation at the boundaries: empty, maximum length, wrong type, missing required,
      unexpected extra field.
- [ ] Idempotency: the same request with the same key twice produces one effect.
- [ ] Rate limit returns 429 with a retry hint.
- [ ] Times are ISO 8601 UTC with the site time zone as a separate labelled field.

```bash
# capture the body, not a summary
curl -sS -X GET "$API/cycles/$CYCLE/privacy-preview/" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -D "$EV/api-preview-200.headers" \
  | tee "$EV/api-preview-200.json" \n  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s),null,2)))"
```

## 2. Privacy invariants

Its own suite, because it is the product's core claim. Each case is exercised against the
running system, not only against a unit test.

| Case | Expected |
|---|---|
| Cohort of exactly 4 requested in a report | Absent. Not an error message that confirms it exists. |
| Cohort of exactly 5 requested | Present |
| Manager applies filters that would narrow to 4 | Refused, and the error does **not** name which filter caused it |
| Manager tries the same narrowing through a different endpoint | Refused identically |
| Free text returned through any engagement endpoint | Reworded, names removed, raw text absent |
| Protected case in the engagement queue | Absent. The count reconciles; no title, no detail, no assignee. |
| Protected case through search, export, or any list endpoint | Absent |
| Employee requests their own cohort size | Returned. Disclosure to the reader about themselves is not a report about others. |
| `authenticated` selects a base table directly | `42501`, insufficient privilege. **This is the case that proves the revoke actually happened**, and the one most likely to be missing. Without it every other case above can pass while the data is reachable by another path. |

### Where they live

`supabase/tests/invariants.test.sql`, pgTAP, run by `supabase test db` in continuous
integration on every change. The file reads as a specification rather than as plumbing,
because it is the product's claim made executable.

```sql
begin;
select plan(9);

-- I1
select is_empty(
  $$ select * from public.cohort_report('<cycle with 4 responses>', '{}'::jsonb) $$,
  'a cohort of four returns nothing'
);
select lives_ok(
  $$ select * from public.cohort_report('<cycle with 5 responses>', '{}'::jsonb) $$,
  'a cohort of five reports'
);

-- I2, and standing rule R-01: the refusal must not name the filter
select throws_ok(
  $$ select * from public.cohort_report('<cycle>', '{"shift":"night"}'::jsonb) $$,
  'P0001', 'below_threshold',
  'narrowing below the floor is refused, and the error names only the invariant'
);

-- I3
select is(
  (select free_text from public.response_feedback where id = '<response with a name>'),
  'the roster is late',
  'free text is returned reworded with names removed'
);

-- I4
select is_empty(
  $$ select * from public.issue_queue where id = '<protected case id>' $$,
  'a protected case never appears in the engagement queue'
);

-- the revoke itself
select throws_ok(
  $$ set local role authenticated; select * from public.responses limit 1 $$,
  '42501',
  'authenticated has no direct grant on responses'
);

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
| `responses` | deny | own only | deny | deny | deny | deny |
| `cohorts` | deny | deny | deny | deny | deny | deny |
| `issues` | deny | deny | own lane | own site | all | deny |
| `evidence` | deny | deny | own lane | own site | all | deny |
| `protected.cases` | deny | deny | deny | deny | deny | allow |

A cell reading `deny` is tested by asserting `42501` or an empty set, not by assuming.
A cell reading a scope is tested twice: once inside the scope expecting rows, once outside
expecting none.

## 3. State machine

| Case | Expected |
|---|---|
| Close with no evidence attached | Refused, `evidence_required` |
| Close with evidence | Allowed, `Closure` record written with who, when, days late |
| Close, then close again | Refused. Terminal. |
| Assign to a lane that lacks authority for the category | Refused, `lane_lacks_authority` |
| Assign to a lane with no named owner | Refused. A lane is not an owner. |
| Open straight to closed | Refused |
| Overdue to in progress | Refused |
| Closure record insert fails mid-transaction | Status unchanged. No closed issue without an audit row. |

## 4. Product flows

Run these as a user, on a phone viewport, not as API calls.

- Receive the invitation, read the privacy preview, answer, submit.
- Answer, lose connection mid-survey, reconnect, confirm nothing was lost or doubled.
- Receive an assignment as a team lead, open it, attach evidence, close it.
- Try to close without evidence and read what the product says.
- Open the queue with forty issues, sort, filter, find one.
- Open a protected row and confirm there is nothing to open.
- Read a close-the-loop message as the employee who raised the issue.

## 5. Cross-cutting

| Axis | What to run |
|---|---|
| Themes | Both. A colour that works in one mode only is not part of the system. |
| Locales | English, Bahasa Indonesia, Tagalog, Arabic. Every screen the change touches. |
| RTL | Arabic. Layout mirrors, the seal does not, numerals and charts do not. |
| Width | 360px first. Then 768 and desktop. |
| Zoom | 200%. Nothing clips, overlaps, or scrolls horizontally. |
| Keyboard | Traverse the whole flow with no mouse. Focus visible and in reading order throughout. |
| Screen reader | The survey and the queue, as flows, not as isolated components. |
| Reduced motion | Every transition honours it. |
| Offline | Answers held on device, stated plainly, sent on reconnect, not duplicated. |
| Slow connection | Throttled to a realistic 3G profile. Nothing blocks on a request that could show known-yet-stale. |
| Device | A low-cost Android handset with a small screen, not only a desktop browser at full size. **That device is the majority case.** |

## 6. Regression

Take the list the engineering lead flagged as touched. For each, run the case that used to
prove it worked. If no such case exists, that is the finding: the surface was never
covered, and the change has just made that visible.

---

## Evidence

| Counts | Does not count |
|---|---|
| The response body, saved | "The shape is right" |
| Command output, saved with the command | "Tests pass" |
| A screenshot at the real width, in the real locale | "It looks fine on mobile" |
| A measured contrast ratio with both hex values | "Contrast is fine" |
| A trace or a HAR for a network case | "It was slow" |
| Both runs: the failing one and the passing one | "I fixed it" |

Naming: `<surface>-<case>.<ext>`, for example `queue-360-ar.png`, `inv-i2-filter.log`,
`api-preview-403.txt`. A reader should know what a file shows from its name.

---

## Defect report

```markdown
### D-02 · Critical · Below-threshold error names the filter that caused it

**Surface.** API, `POST /api/reports/`
**Owner.** backend-engineer
**Evidence.** `evidence/inv-i2-filter.log`

**Reproduce**
1. Sign in as a manager on Warehouse B.
2. POST `/api/reports/` with `{"tenure_band": "0_30", "shift": "night"}`.
3. Read the 409 body.

**Expected.** `{"detail": "below_threshold"}`
**Actual.** `{"detail": "below_threshold", "field": "shift"}`

**Why it is critical.** Naming the field lets a manager binary-search filters to isolate
an individual, which is exactly what I2 exists to prevent. The invariant holds on the data
and leaks through the error.
```

Route it to the responsible agent with `status: rejected` and a round number. Do not fix
it yourself.

---

## Release readiness report

Produced by `qc-lead`, read by Shehab. The "knowingly untested" section is mandatory and
is never empty by omission: if everything really was tested, say that explicitly.

```markdown
# Release readiness · 2026-09-20-privacy-preview

**Verdict: go.**

## Tested

| Surface | Cases | Passed | Failed and fixed | Evidence |
|---|---|---|---|---|
| API contract | 14 | 14 | 2 | `evidence/api-*` |
| Privacy invariants | 8 | 8 | 1 | `evidence/inv-*` |
| State machine | 8 | 8 | 0 | `evidence/sm-*` |
| Product flows | 7 | 7 | 0 | `evidence/flow-*` |
| Cross-cutting | 11 | 10 | 0 | `evidence/xc-*` |
| Regression | 6 | 6 | 0 | `evidence/reg-*` |

## Defects found and closed

| # | Severity | What | Fixed by |
|---|---|---|---|
| D-02 | Critical | Below-threshold error named the filter | backend-engineer |
| D-05 | High | Arabic privacy preview clipped the threshold row at 360px | frontend-engineer |
| D-07 | High | Preview figures cached for 60s, so they were not live | backend-engineer |

## Knowingly untested

| What | Why | Risk |
|---|---|---|
| Tagalog on a physical handset | No device available this cycle | Low. Lengths verified in the emulator. The brand rule asks for a physical device, so this stays open. |
| Concurrent cohort change at submit | No harness to force the race | Medium. The behaviour is undefined and Shehab has a decision open on it. |

## My own pass

Beyond the engineer's plan I probed, by blast radius:

- Every endpoint that can reach cohort data, not only the new one. Two older report
  endpoints enforce the threshold through the same manager. Confirmed.
- The protected channel, because the change touched shared serialisation. No leak.
- The queue at forty issues in Arabic at 360px, because that combination had not been run.

## Product claims, re-verified after this change

| Claim | Holds |
|---|---|
| Nothing closes without evidence | yes, `evidence/sm-close-no-evidence.log` |
| Nothing reports below threshold | yes, `evidence/inv-i1.log` |
| Nothing routes to someone without authority | yes, `evidence/sm-lane-authority.log` |
| Every open item has an owner and a date | yes, `evidence/sm-accept-no-owner.log` |
```

The example shows content, not order. `readiness.md` follows the nine sections, in the
order, fixed in `qc-lead`'s agent file.

---

## The QC lead's audit of the engineer's work

Trust nothing, check everything. In order:

1. **Does the evidence exist?** Open every path in the handoff's `produced`. A missing
   file is a `PHANTOM_OUTPUT` finding, and the run blocks.
2. **Does it show what the log claims?** Read the response body, look at the screenshot.
   A log line saying "passed" beside a screenshot of a broken layout happens.
3. **Was every planned case run?** Compare the plan against the results, row by row.
4. **What was not tested?** This is the finding this role exists to produce. Hunt for the
   negative case nobody thought of, the locale nobody opened, the state nobody reached,
   the device nobody used.
5. **Run your own pass**, chosen by blast radius rather than convenience. Do not re-run
   the suite; probe where a failure would hurt most.
6. **Re-verify the product's claims.** Nothing closes without evidence, nothing reports
   below threshold, nothing routes to someone without authority, every open item has an
   owner and a date.

A no-go from this role is overturned only by Shehab, and the override is recorded in the
ledger by the orchestrator. `qc-lead` does not dispatch a re-test itself; it sets `next` to
`qc-engineer` in its handoff and the orchestrator runs it.

---

## Responsive and bilingual, tested every run

Two rules that are not optional and are not sampled.

### Every width

A surface is tested at **320, 360, 768, 1024 and 1440**, plus one width between each pair,
because layouts break at 1023 and 769 far more often than at the round numbers. Both
orientations on phone and tablet. 200% zoom counts as a width: at 200% a 1280px window is a
640px layout.

| Check | Fail looks like |
|---|---|
| No horizontal scroll on the page body at any width | The body scrolls sideways. A table inside its own container may. |
| Touch targets 48 by 48 at every width | A control that shrinks below it on desktop with touch |
| Nothing hidden to fit | A control present at 1440 and absent at 360 with no detail view carrying it |
| Landscape phone | A 360px-tall viewport. Most vertical layouts have never been opened at one. |
| Longest locale at the narrowest width | Tagalog at 320px, not English at 360px |
| RTL at every width | Mirrors at desktop, breaks at 360 |

Evidence is a screenshot per width, per theme, in the longest locale, plus landscape and
200% zoom. A test log claiming "responsive verified" with three screenshots has verified
three widths.

### Both languages

**Every flow is run twice, once in English and once in Arabic.** Not spot-checked, not
sampled, not "the Arabic strings exist so it is covered".

| Check | |
|---|---|
| Every string resolves in both catalogues | A missing key is a failure, never a silent fallback to English |
| RTL layout mirrors correctly | Logical properties throughout. The seal does not mirror; the lockup order does. |
| Numerals, charts, media controls and identifiers do not mirror | They read left to right inside a right-to-left line |
| Arabic sets one to two points larger, line height up 15 to 20% | Set too small it loses detail first on the cheap screens |
| No string concatenated with a count | Six plural categories in Arabic. Check the ones a reader notices: zero, one, two. |
| Every Arabic string marked `needs native review` | Until a native speaker has read it on a physical device |
| The longest locale does not break any layout | Indonesian runs 15 to 20% longer than English, Tagalog further |

A feature that passes in English and was not opened in Arabic has not been tested. Record
it as untested surface in the readiness report rather than letting it read as covered.
