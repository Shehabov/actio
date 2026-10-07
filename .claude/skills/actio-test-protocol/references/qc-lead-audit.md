# The QC lead's audit

Read when: you are qc-lead, before you open any evidence. Trust nothing, check everything. qc-engineer is held to the same list, so it reads it too before it hands off.

## 1. The evidence audit

File by file, not summary by summary. Open every path in qc-engineer's `produced` and every evidence path `evidence/qc/cases.md` names: a sample, plus every failure.

| Check | How | Failure looks like |
|---|---|---|
| Evidence exists | Glob `evidence/qc/` and match every `produced` path and every path in `cases.md` | A path not on disk or empty: `PHANTOM_OUTPUT`, the run blocks |
| Evidence shows the claim | Open it. Read the assertion, the timestamp, the build reference | A "passed" log line beside a broken layout, or a passing screenshot with no failing case beside it |
| The run is this build | qc-engineer's `reviewed` equals the snapshot you take now (`node .actio/bin/run.mjs snapshot <run>`), and evidence mtimes are after the last change to the touched paths | Evidence dated before the last change landed: `GATE_STALE`, reject with the delta |
| Planned equals run | Every row of `cases.md` has a result | A case with no result anywhere |
| Failures were fixed, not muted | Trace each failure to a fix and a re-run, both on disk | A skipped test, a loosened assertion, a widened timeout |
| Counts reconcile | `results.json` stats equal the counts and exit line at the end of `run.log`; one directory per pass | "All tests passed" with no number |
| The source is named | Every pgTAP result is labelled PGlite or the project, and the privacy suite has a run on the project | A privacy claim evidenced only by the offline PGlite run |
| Screen evidence is a suite pass | `run.log` ending in its exit line, `results.json`, a trace per case, the failing pass still beside the passing one | An MCP capture offered as gate evidence: reject it to qc-engineer |
| The evidence is this run's own | Timestamps, build reference and counts are consistent with this run | Evidence that looks copied from an earlier run: escalate, say what you observed, do not accuse and do not ignore it |

## 2. The tests nobody wrote

Build the coverage grid from the evidence only, and print the empty cells. An empty cell is a finding, never a gap noted in passing.

- **Locales.** Bahasa Indonesia, English, Tagalog, Arabic. Arabic includes the mirrored layout, Latin runs isolated inside Arabic strings, and Western numerals still reading left to right.
- **States.** Empty, one item, long list, loading, offline, permission denied, expired session, overdue, reopened, protected, below threshold, a single-name user, an action with no owner yet.
- **Inputs.** The negative case: empty, maximum length, wrong type, duplicate submit, back button mid-flow, two people editing the same action.
- **Devices.** Low-end Android at 360 wide, touch targets at 48, no hover.
- **Access.** The role that should not see it. The denial is tested, not only the permission.

A probe that finds something no suite case covers is untested surface: route it to qc-engineer with `status: rejected` and the exact case to add. You do not write the suite.

## 3. Your own pass

Not a re-run of the suite: an attempt to break what matters most. Choose 5 to 9 paths by blast radius, never by how easy they are to reach: silent and irreversible ranks above loud and reversible, always. Arabic is on the list or its absence is justified in writing. Write the reason each path made the list into `checks[]`. Capture evidence for every probe, pass or fail, under `evidence/qc-lead/`. Ask of each: what failure does this change make possible that the previous build did not, and what would release-engineer find at deploy time that I can find now.

## 4. The product claims

If one breaks the product is lying, and that is a no-go whatever the tests say. Probe each on this build, on the project, as the role that should be refused (`execute_sql` under `set local role`, and PostgREST under the publishable key).

| Claim | The probe | Expected |
|---|---|---|
| Nothing closes without evidence | Close an action with no attachment and no note | Refused, with a written reason |
| Nothing reports below threshold | Open a result for a group under the reporting threshold | Suppressed, not rounded, not blank without explanation |
| Nothing routes without authority | Assign an item to someone with no authority over the fix | Rejected or reassigned, never silently accepted |
| Every open item has an owner and a date | Accept an action leaving owner or date empty | Refused |

Also confirm: an overdue item never closes itself; a protected item never appears in a manager's filterable view or in the normal queue.
