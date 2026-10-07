# Examples: an API call, a defect record, the content of a readiness verdict

Read when: you write your first API case, your first defect record, or the untested and residual-risk part of a verdict.

## An API call that captures the body

```bash
# capture the body, not a summary
# SUPABASE_URL from get_project_url, PUBLISHABLE_KEY from get_publishable_keys
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/privacy_preview" \
  -H "apikey: $PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"p_cycle\": \"$CYCLE\"}" \
  -D "$EV/api-preview-200.headers" \
  | tee "$EV/api-preview-200.json" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s),null,2)))"
```

## A defect record

In v2 this record is the file `evidence/qc/defects/<id>.md`. The handoff finding carries one line and points here.

## Defect report

```markdown
### QE-2 · blocker · Below-threshold error names the filter that caused it

**Surface.** API, `POST /rest/v1/rpc/cohort_report`
**Owner.** backend-engineer
**Evidence.** `evidence/inv-i2-filter.log`

**Reproduce**
1. Sign in as a manager on Warehouse B.
2. POST `/rest/v1/rpc/cohort_report` on the project URL from `get_project_url`, with the
   publishable key as `apikey`, the manager's token as the bearer, and
   `{"p_cycle": "<cycle>", "p_filters": {"tenure_band": "0_30", "shift": "night"}}`.
3. Read the 400 body.

**Expected.** `{"code": "P0001", "message": "below_threshold", "details": null, "hint": null}`
**Actual.** `{"code": "P0001", "message": "below_threshold", "details": "shift", "hint": null}`

**Why it is a blocker.** Naming the field lets a manager binary-search filters to isolate
an individual, which is exactly what I2 exists to prevent. The invariant holds on the data
and leaks through the error.
```

Route it to the responsible agent with `status: rejected` and a round number. Do not fix
it yourself.

## The content of a readiness verdict

A v1 example, kept for its content, not its order. In v2 the same content lives in the qc-lead handoff: the verdict is the first `checks[]` entry, what was tested and what failed and was fixed are `checks[]`, the knowingly untested surface and the residual risk are `findings[]` in the order a failure would hurt, the product claims are `checks[]`, and its own pass is `checks[]` with paths under `evidence/qc-lead/`. The untested list is never empty by omission: if everything really was tested, say so explicitly.

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

