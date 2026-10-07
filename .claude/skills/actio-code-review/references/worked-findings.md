# Worked findings

The old skill and agent file each carried their own comment format (two different ones). They are replaced by the handoff `findings[]` entry. The two skill examples and the agent's two examples are rewritten here in that one format. Read your first finding of a run, or when you reject a handoff.

Fields: `id` (`PR-n`), `severity`, `where` (file:line), `rule`, `what` (observation, then consequence, at most 240 characters), `fix`, `status`. Longer proof goes in `evidence/peer-reviewer/` and its path in `produced`.

```json
{"id":"PR-1","severity":"blocker","where":"web/src/lib/issues/close.ts:42","rule":"I7","what":"Closure is written in a separate PostgREST call from the status update, with no shared transaction. If the insert fails the issue reads closed with no audit record, a state I7 says cannot exist.","fix":"Move both writes into one database function called once through rpc. Add a pgTAP test that forces the closure insert to fail and asserts the status did not move.","status":"open"}
```

```json
{"id":"PR-2","severity":"major","where":"web/components/PrivacyPreview.tsx:18","rule":"I1, ADR-0004","what":"const THRESHOLD = 5 hardcodes a server invariant in the client. If an organisation raises its threshold this screen states a number the server does not honour, on the screen whose job is to be verifiable.","fix":"Take it from the endpoint response, which already returns reporting_threshold.","status":"open"}
```

```json
{"id":"PR-3","severity":"blocker","where":"supabase/migrations/20260921093000_cohort_report.sql:88","rule":"I2","what":"p_group_by accepts any dimension list and applies the floor only to department. Grouping by site, shift and contract type can land on a cell of two people and expose free text.","fix":"Apply the threshold to the cardinality of the final grouped result and suppress the cell. Add a test that a three-dimension group returns suppressed cells.","status":"open"}
```

## Rejecting a bad input

Bad input is rejected, never reviewed around and never filled in by you. A rejection says what is missing and what would make it acceptable, in that order, and nothing else: `status: rejected`, one `blockers` entry, `next` the source agent.

```json
{"what":"backend-engineer/handoff.json lists four produced paths; two do not exist on disk, and gates[0].evidence points at a log that was not written.","why":"There is nothing here to review. Approving would certify code I cannot see.","needs":"backend-engineer"}
```
