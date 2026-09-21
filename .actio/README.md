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
        │   └── handoff.json   step 5
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
- Runs are kept. They are the audit trail for a product whose entire claim is that nothing
  closes without proof.

The loop these artefacts record is defined in
[`../.claude/skills/actio-agent-protocol/SKILL.md`](../.claude/skills/actio-agent-protocol/SKILL.md).
The flow between agents is in [`../docs/WORKFLOW.md`](../docs/WORKFLOW.md).
