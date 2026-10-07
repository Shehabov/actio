# Worked example: one pass, start to finish

Read it when `node .actio/bin/run.mjs handoff <path>` rejects your handoff, or before your
first v2 pass. The rules are in `../SKILL.md`; this file only shows them filled in.

## 1. The checkpoint, written before any work

`.actio/runs/2026-10-07-privacy-preview/code-analyst/handoff.json`, the first Write of the pass:

```json
{
  "run": "2026-10-07-privacy-preview",
  "agent": "code-analyst",
  "stage": 5,
  "status": "working",
  "started": "2026-10-07T09:14:02Z",
  "plan": [
    "Scan the 6 changed SQL files and 4 TS files line by line, at the snapshot in the dispatch",
    "Criteria not in the dispatch: every raise and every error path read for a threshold leak",
    "Assumed, not checked: the verify bundle for this snapshot is green; cite it, do not rebuild",
    "Risk: a threshold leak on the error path; read every raise in the new functions",
    "Risk: a null cohort size counted as zero; test the boundary at 4, 5 and null"
  ],
  "next": null
}
```

## 2. The final handoff

```json
{
  "run": "2026-10-07-privacy-preview",
  "agent": "code-analyst",
  "stage": 5,
  "status": "passed",
  "started": "2026-10-07T09:14:02Z",
  "finished": "2026-10-07T09:31:55Z",
  "reviewed": "3f2a9c1",
  "consumed": [
    ".actio/runs/2026-10-07-privacy-preview/tech-architect/brief-backend.md",
    ".actio/runs/2026-10-07-privacy-preview/backend-engineer/handoff.json",
    ".actio/runs/2026-10-07-privacy-preview/bug-historian/brief/code-analyst.md"
  ],
  "produced": [".actio/runs/2026-10-07-privacy-preview/evidence/code-analyst/scan.log"],
  "gates": [{ "name": "review-2of3", "result": "pass", "evidence": ".actio/runs/2026-10-07-privacy-preview/code-analyst/handoff.json" }],
  "plan": [
    "Scan the 6 changed SQL files and 4 TS files line by line, at the snapshot in the dispatch",
    "Risk: a threshold leak on the error path; read every raise in the new functions",
    "Risk: a null cohort size counted as zero; test the boundary at 4, 5 and null"
  ],
  "checks": [
    { "criterion": "Every changed function read for null, boundary and error paths", "result": "pass", "evidence": "evidence/code-analyst/scan.log" },
    { "criterion": "Threshold boundary at 4, 5 and null", "result": "pass", "evidence": "evidence/verify/3f2a9c1/summary.json" }
  ],
  "findings": [
    { "id": "CA-1", "severity": "minor", "where": "supabase/migrations/20261007091000_privacy_preview.sql:42", "rule": "R-01", "what": "raise message interpolates the filter key", "fix": "state the invariant only", "status": "fixed" }
  ],
  "blockers": [],
  "missing_inputs": [],
  "machinery_findings": [],
  "decisions_for_shehab": [],
  "next": "engineering-lead"
}
```

The minor finding did not reject: the author fixed it in the same pass. The second check cites
the verify bundle for the same snapshot instead of re-running the suite.

## 3. Shapes that `run.mjs handoff` checks

A rejection, round 2:

```json
"status": "rejected",
"blockers": [{ "what": "brief-frontend.md does not say what the screen shows below the threshold", "why": "the below-threshold state cannot be built or tested without it; round 2", "needs": "tech-architect" }],
"next": "tech-architect"
```

A gate that does not apply to this change (R-18):

```json
"gates": [{ "name": "copy", "result": "n/a", "reason": "no user-visible string changed: the diff touches only supabase/tests/" }]
```

A decision for Shehab, moved verbatim from the v1 protocol:

```json
{
  "question": "Should the privacy preview show the live group size before the threshold is met, or suppress the whole screen?",
  "options": [
    "Show it with a stated minimum. Honest, but tells a small team it will not be reported before they answer.",
    "Suppress and explain. Protects the group, but the reader learns nothing about the mechanism."
  ],
  "recommendation": "Show it with a stated minimum. The product's argument is that mechanism beats reassurance, and a suppressed screen reads as something being hidden."
}
```

## 4. The final message

```
passed · review-2of3 pass · next engineering-lead
blockers 0 · findings 1 minor, fixed
handoff .actio/runs/2026-10-07-privacy-preview/code-analyst/handoff.json
```
