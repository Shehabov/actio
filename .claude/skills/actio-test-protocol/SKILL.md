---
name: actio-test-protocol
description: "Test planning, evidence and release readiness for Actio: API negatives, privacy invariants on the project, state machine, phone flows, four locales, themes, accessibility and regression, with the committed Playwright suite as gate evidence and the MCP for exploration only. Use when qc-engineer plans or runs a pass, qc-lead audits evidence and issues the quality go or no-go, or engineering-lead scopes regression. Findings go in handoff.json, evidence under the run directory."
---

# Test protocol

Used by `qc-engineer` (tests, produces evidence), `qc-lead` (audits that evidence, decides go or no-go) and, for its smoke and invariant probes, `engineering-lead`. The toolchain, the blocked rules and the handoff are in `actio-agent-protocol`.

**A test that cannot be evidenced did not run.** Evidence is a file under `.actio/runs/<run-id>/evidence/<ev>/`, cited by path from the handoff. `<ev>` is `qc` for qc-engineer, `qc-lead` for qc-lead, `engineering-lead` for engineering-lead.

## Reaching each surface

| Surface | How |
|---|---|
| Build, lint, types, unit tests | Never re-run. Read `evidence/verify/latest.json`, written by engineering-lead's `node .actio/bin/verify.mjs --run <id>`. It holds for your pass while the only paths changed since engineering-lead's `reviewed` snapshot are suite cases you added: take `node .actio/bin/run.mjs snapshot <id>`, then `git diff --stat <engineering-lead's reviewed> <that sha>`. Any other changed path is `GATE_STALE`: reject back |
| API | PostgREST at `<project url>/rest/v1/`: base from `get_project_url`, key from `get_publishable_keys` as `apikey`, a signed-in test user's token as the bearer. curl or a node fetch script, the full request and response saved. Never the service role key |
| Database, on the project | pgTAP: each `supabase/tests/*.test.sql` through `execute_sql`, wrapped `begin; ... rollback;`. Role and RLS checks use `set local role anon` or `authenticated` and `set local request.jwt.claims` inside it |
| Database, offline | `npm run db:test` (PGlite, no Docker). Evidence labelled PGlite, never a substitute for the run on the project |
| Edge Functions | Called at the function URL (base from `get_project_url`); `get_logs` shows what happened. No local Deno |
| Screens and flows | The committed suite, `npm run e2e` in `web/` and in `extension/`. See Playwright below |
| Contrast | A WCAG ratio computed in a node script from the `BRAND.md` hex values, after the computed style confirms the rendered element uses them. Never estimated |

## The cases file

There is no `plan.md`. Before the first test, write `evidence/qc/cases.md`: one table, one row per planned case, the result column filled as you run. qc-lead diffs it against what ran. A case with no result reads `not run` with the reason. Raw output is one file per case, named `<surface>-<case>.<ext>`.

| # | Surface | Case | Expected | Result | Evidence |
|---|---|---|---|---|---|
| 1 | API | POST `rpc/privacy_preview`, cohort 23 | 200, live figures, `below_threshold` false | pass | `api-preview-200.json` |
| 2 | Privacy | Cohort of 4 never in a report, pgTAP on the project | absent | pass | `inv-i1-project.log` |
| 3 | API | The same call with a manager token | 403 | fail, QE-1 | `api-preview-403.txt` |
| 4 | Cross | Tagalog on a physical handset | declared untestable, no device | not run | none |

## Surfaces

Every change is tested across the API contract, the privacy invariants, the state machine, product flows, cross-cutting and regression. "Covered" means evidenced on this build, never reasoned. A surface the change cannot touch is `n/a` with the reason, never skipped in silence. Flows and cross-cutting are in `references/ui-pass.md`.

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
| `authenticated` holds a privilege on the reworded view or the raw free-text column | No. Asserted with `has_table_privilege` and `has_column_privilege`, never by a refused select alone: a `security_invoker` view refuses a select whether a grant exists or not, so only the privilege check catches an inert grant. |
| `authenticated` selects a base table directly | `42501`, insufficient privilege. **This is the case that proves the revoke actually happened**, and the one most likely to be missing. Without it every other case above can pass while the data is reachable by another path. |

The suite is `supabase/tests/invariants.test.sql`, run two ways on every change: on the project through `execute_sql`, and offline with `npm run db:test`, each output labelled with where it ran. **A change that touches a policy, a grant, a view or a security-definer function and does not touch this file is a finding.** The SQL example and the RLS matrix are in `references/invariants-sql.md`.

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

## 6. Regression

Take the list the engineering lead flagged as touched. For each, run the case that used to
prove it worked. If no such case exists, that is the finding: the surface was never
covered, and the change has just made that visible.

## Playwright

The MCP finds, the suite proves. An MCP capture is investigation evidence and a defect's reproduction, never gate evidence. A defect found through it is closed by a suite case that fails on the defect and passes on the fix, both runs saved; qc-engineer adds the case.

- **The suite** is `@playwright/test` in `web/e2e/` and `extension/e2e/`, run by `npm run e2e`. Browser: Playwright's Chromium, `npx playwright install chromium` once.
- **Projects** are generated, named `<width>-<theme>-<locale>`: widths 320, 360, 768, 1024 and 1440, themes light and dark, English (left to right) and Arabic (right to left). Every spec runs in every project unless its title says why not. 320 and 360 are a Chromium Android descriptor, mobile and touch, width only overridden. Each spec asserts `window.innerWidth` equals the project width, `dir` on `html` and the body's computed `direction`. The `layout-*` set adds in-between widths, landscape, 200% zoom and the longest locales.
- **A resized desktop window is not a phone** (hard rule 4). Phone evidence is the 320 and 360 projects.
- **One directory per pass**, so a failing run survives its re-run (Playwright empties its output directory). `<pass>` is `run-1`, `rerun-QE-2`. From the repository root, in Git Bash:

```bash
cd web
EV=../.actio/runs/<run-id>/evidence/<ev>/e2e/<pass>; mkdir -p "$EV"
PLAYWRIGHT_HTML_OPEN=never PLAYWRIGHT_HTML_OUTPUT_DIR="$EV/report" PLAYWRIGHT_JSON_OUTPUT_FILE="$EV/results.json" npm run e2e -- --reporter=list,html,json --trace=on --output="$EV/artifacts" > "$EV/run.log" 2>&1; echo "exit $?" >> "$EV/run.log"
```

Read counts from `results.json` stats. Never open the HTML report or the trace viewer: both never return.

- **The MCP** (`mcp__playwright__*`, qc-engineer and qc-lead only) is for exploration, reproduction and live capture. Read `references/playwright-mcp.md` before the first call. When it does not answer, run the suite for what can still be proved, set `status: blocked` with the reason `playwright MCP not answering`, and name each planned case that needed it.

## Evidence

| Counts | Does not count |
|---|---|
| The response body, saved | "The shape is right" |
| Command output, saved with the command | "Tests pass" |
| A Playwright screenshot at the real width, in the real locale | "It looks fine on mobile" |
| A contrast ratio computed by the node script, with both hex values | "Contrast is fine" |
| A pgTAP run labelled with where it ran, PGlite or the project | "The database tests pass" |
| A trace or a HAR for a network case | "It was slow" |
| Both runs: the failing one and the passing one | "I fixed it" |

Naming: `<surface>-<case>.<ext>`, for example `queue-360-ar.png`, `inv-i2-filter.log`,
`api-preview-403.txt`. A reader should know what a file shows from its name.

## Defects

A defect is a handoff finding plus a record file. The record, `evidence/qc/defects/<id>.md`, carries: severity, surface, numbered reproduction steps, expected, actual, evidence paths, locale and device where found, the responsible agent and whether it is a regression. The finding carries `severity`, `where` (the record path), `what` (actual against expected, then `owner <agent>`, 240 characters) and `status`. A defect you cannot reproduce cleanly is a note, labelled as one.

One severity ladder. **blocker**: a privacy invariant breach, data loss, an issue closing without evidence. **major**: a broken flow, a failed auth check, an accessibility failure that blocks a task. **minor**: a wrong state, a wrong string, a brand rule violation. **nit**: cosmetic with a workaround. A blocker is never negotiated down. Only blocker and major reject; route them to the owner with the round number. Never fix the code.

## References

| File | Holds | Read when |
|---|---|---|
| `references/ui-pass.md` | Product flows, the cross-cutting table, every width, both languages | The change touches a screen, a string or a layout |
| `references/playwright-suite.md` | Where the suite lives, the `layout-*` projects, the outputs of a pass, the extension suite | You write or run a suite pass, or add a project |
| `references/playwright-mcp.md` | The two instruments in full, the MCP session rules, when it does not answer | Before the first `mcp__playwright__*` call, and when it fails |
| `references/invariants-sql.md` | Where the invariant suite lives, the SQL example, the RLS matrix | You write, run or review the privacy suite, or a policy, grant or view changes |
| `references/qc-lead-audit.md` | The evidence audit, the coverage grid, the blast-radius probes, the four product claims | You are qc-lead, or you want to know what you will be audited on |
| `references/examples.md` | An API call, a defect record, the content of a readiness verdict | Your first API case, defect record or verdict |
