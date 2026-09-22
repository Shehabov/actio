# .actio

The swarm's shared memory. Every run an agent performs leaves its working record here, so
a run can be inspected after the fact without reading a transcript.

```
.actio/
├── README.md                  this file
├── TEMPLATE/                  the artefacts every agent writes, as blank templates
│   ├── plan.md
│   ├── review.md
│   └── handoff.json
└── runs/
    └── <run-id>/              one directory per run
        ├── run.json           orchestrator: the plan, assignments, gates
        ├── ledger.md          orchestrator: append-only event log
        ├── <agent>/
        │   ├── plan.md        step 1 and the step 2 audit
        │   ├── review.md      step 4
        │   ├── handoff.json   step 5, first pass
        │   └── handoff-stage<N>.json   step 5, any later pass
        └── evidence/          screenshots, logs, test output, traces
```

Run id is `<yyyy-mm-dd>-<short-slug>`, for example `2026-09-20-privacy-preview`.
Timestamps come from the shell, never invented.

## Rules

- An agent that produced no `handoff.json` did not run, whatever its transcript says.
- Every path listed in a handoff's `produced` must exist on disk. A missing path is a
  utilisation failure, not a rounding error.
- Evidence is a file. A claim in prose that something passed is not evidence.
- `ledger.md` is append-only. Correct an entry by appending a correction, never by editing
  history.
- Runs are kept on disk and never deleted. Git ignores `.actio/runs/`, so evidence blobs stay
  out of history; the register, the ADRs and the release note carry what matters. They are the audit trail for a product whose entire claim is that nothing
  closes without proof.

## Scripts

| Script | Run by | Does |
|---|---|---|
| `bin/sync-gates.mjs <run-dir>` | orchestrator, after every handoff | Copies each gate result from its owner's handoff into `run.json`. Never decides a gate. |
| `bin/utilisation-check.mjs <run-dir> [--json]` | orchestrator, after every stage and at closure | The utilisation check. Exits 1 on any finding. Run the sync first. |
| `bin/god-mode-slice.js` | the Workflow tool, not `node` | One-off end-to-end test harness from the 2026-09-22 run. Hard-codes its repo path and run id. |

The loop these artefacts record is defined in
[`../.claude/skills/actio-agent-protocol/SKILL.md`](../.claude/skills/actio-agent-protocol/SKILL.md).
The flow between agents is in [`../docs/WORKFLOW.md`](../docs/WORKFLOW.md).
