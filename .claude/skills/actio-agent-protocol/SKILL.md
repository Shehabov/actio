---
name: actio-agent-protocol
description: The operating loop every Actio agent follows: plan, audit the plan, execute, review, hand off. Use at the start of ANY task performed by an Actio agent, before planning or touching a file. Defines the run artefacts, the handoff schema, escalation rules, the rejection protocol and what counts as evidence.
---

# The Actio agent protocol

Every agent runs this loop, every task, no exceptions. The loop is what makes the swarm
auditable: a run leaves a paper trail on disk that anyone can inspect afterwards without
reading a transcript.

If you are an Actio agent and you are reading this mid-task, you are either at step 1 or
you skipped it. Go back.

---

## The five steps

| # | Step | Produces | Path |
|---|---|---|---|
| 1 | Plan | The plan | `.actio/runs/<run-id>/<agent>/plan.md` |
| 2 | Audit the plan | Revision log, appended to the plan | same file |
| 3 | Execute | The work | wherever the work lives |
| 4 | Review | The self-review | `.actio/runs/<run-id>/<agent>/review.md` |
| 5 | Hand off | The handoff record | `.actio/runs/<run-id>/<agent>/handoff.json` |

Step 2 runs **before** execution. An audit after the fact is a review, and you already
have one of those at step 4.

### 1. Plan

Write it before touching anything. Copy `.actio/TEMPLATE/plan.md`. It must state:

- The task in one sentence.
- Every input, with what you are taking from it.
- Every assumption, and whether you checked it.
- Acceptance criteria, stated so someone else could verify them.
- What is out of scope, named so nobody mistakes it for an oversight.
- The rules that constrain the work, cited by file and section rather than by value.
- The steps.

A plan that says "implement the feature" is not a plan. If you cannot write acceptance
criteria, you do not understand the task yet, and that is the finding.

### 2. Audit the plan

Adversarially interrogate your own plan before you execute it. Answer all five in writing,
in the plan file, even where the answer is "nothing".

1. What is missing from the plan?
2. What did I assume without checking?
3. Which Actio rule could this break? Check `BRAND.md` and this file's hard rules.
4. What would the downstream agent reject?
5. What is the failure mode nobody has named yet?

Record what changed in the revision table. A plan that came through the audit with zero
revisions is suspicious: either the task is trivial or the audit was performed for show.
State which.

### 3. Execute

Against the audited plan. If reality forces a departure from the plan, amend the plan and
say why, in the plan file. Do not let the record and the work drift apart.

### 4. Review

Verify your own output against three things, in order:

1. Your own acceptance criteria from step 1.
2. `BRAND.md`, if the work touches anything a user sees or reads.
3. Your role's definition of done, in your own agent file.

Fix what you find. Where you cannot fix it, say plainly what it is and why, and carry it
into the handoff as a blocker. An unfixed problem that is named is acceptable. An unfixed
problem that is quiet is a defect.

### 5. Hand off

Write `handoff.json`. The orchestrator parses it, so the key names are fixed.

**Every handoff carries a `stage` key**, matching the `stage` of the plan entry it answers.
The utilisation check pairs handoffs to plan entries by it.

**You never dispatch another agent.** Only the orchestrator dispatches, because it writes
the ledger and runs the utilisation check, and a dispatch it did not make reads as a skipped
gate. To send work back or forward, set
`next` and `blockers[].needs` and return. The orchestrator routes it.

**An agent that runs more than once in a plan writes one handoff per pass.** The first pass
writes `handoff.json`; every later pass writes `handoff-stage<N>.json`. `bug-historian` is
the case this exists for: it publishes the regression brief at stage 1 and runs the guard at
stage 7, and while both passes wrote one path the guard destroyed the brief's record before
closure, so every downstream `consumed[]` pointing at the brief read as `FALSE_CONSUMPTION`
against agents that had done nothing wrong. Recorded as BUG-0016.

**A promised input that never arrived, and that you worked around, goes in
`missing_inputs[]`, not in `blockers[]`.** A blocker stops the run. An input you routed
around without stopping is a fact the next agent needs and the utilisation check must see,
and it belongs in neither the prose summary nor the blocker list.

**Defects in the machinery itself go in `machinery_findings[]`**: an agent definition, a
skill or this protocol being ambiguous, self-contradictory, or missing something the task
needed. Name the file. This is as valuable as the feature work and it is how the swarm is
maintained.

---

## What you may assume is installed

Checked on the Product Lead's machine, Windows 11 with Git Bash. Assuming otherwise wastes
a dispatch.

Present on the machine: git, node 24, npm, npx, and the Supabase MCP server (`supabase` in
`.mcp.json`, scoped to one project). Nothing else may be assumed. The swarm does not depend
on Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, jq or python, and none of them
is a required step, a gate criterion, an evidence source or an allowed permission. The full
statement is under Toolchain in `CLAUDE.md`, and database work follows `actio-supabase`. **A
missing tool is reported as blocked, never faked:** set `status` to `blocked`, name the tool
and the error in `blockers`, and run whatever proof you still can. For the Supabase MCP the
reason is `supabase MCP not authorised`, the offline PGlite proof (`npm run db:test`) still
runs, and the orchestrator escalates to Shehab, who authorises it with `/mcp`.

| Available | Not available |
|---|---|
| `git`, `node`, `npm`, `npx`, the Supabase MCP. Git Bash also carries `grep`, `sed`, `awk` and `find` for reading files. | Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, **`jq`** and python. Parse JSON with `node -e` instead of `jq`. |

**Do not write a multi-line artefact through a Bash heredoc.** `cat > file <<EOF` does not
reliably terminate in this environment: it hangs and is killed at the timeout with no file
created. Use the file-writing tool, or write a script file and run it. This is recorded as
BUG-0023 and it has cost more than one agent its whole turn.

**Commands can be slow here.** A Bash call that would be instant elsewhere can exceed two
minutes. Prefer the dedicated search and read tools over shell loops.

---

## Run artefacts

```
.actio/runs/<run-id>/
├── run.json                 orchestrator only: plan, assignments, gates
├── ledger.md                orchestrator only: append-only event log
├── <agent>/
│   ├── plan.md              steps 1 and 2
│   ├── review.md            step 4
│   ├── handoff.json         step 5
│   └── <role artefacts>     ADRs, specs, findings, task briefs, test plans
└── evidence/                screenshots, logs, command output, traces
```

**Run id** is `<yyyy-mm-dd>-<short-slug>`, for example `2026-09-20-privacy-preview`. The
orchestrator assigns it and every agent in the run uses the same one.

**Timestamps** come from the shell, never from memory and never invented:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

---

## The handoff schema

```json
{
  "run": "2026-09-20-privacy-preview",
  "agent": "ux-auditor",
  "stage": 3,
  "status": "passed",
  "started": "2026-09-20T09:14:02Z",
  "finished": "2026-09-20T09:41:55Z",
  "consumed": [
    ".actio/runs/2026-09-20-privacy-preview/ux-designer/spec.md",
    ".actio/runs/2026-09-20-privacy-preview/ux-designer/handoff.json"
  ],
  "produced": [
    ".actio/runs/2026-09-20-privacy-preview/ux-auditor/findings.md",
    ".actio/runs/2026-09-20-privacy-preview/evidence/contrast-privacy-preview.json"
  ],
  "gates": [
    {
      "name": "design",
      "result": "pass",
      "evidence": ".actio/runs/2026-09-20-privacy-preview/ux-auditor/findings.md"
    }
  ],
  "blockers": [],
  "missing_inputs": [],
  "machinery_findings": [],
  "decisions_for_shehab": [],
  "next": "ux-writer"
}
```

| Field | Rule |
|---|---|
| `run` | The run id, identical across every agent in the run |
| `agent` | Your agent name, matching your file name |
| `stage` | The `stage` of the plan entry this handoff answers |
| `status` | `passed`, `blocked`, `rejected`, `escalated`. Nothing else. |
| `started`, `finished` | ISO 8601 UTC, from the shell |
| `consumed` | Every path you actually read. This is how the orchestrator proves an upstream agent was used. Listing something you did not read is falsifying the record. |
| `produced` | Every path you wrote. Each one must exist on disk. |
| `gates` | Only gates **you** own, by the names in `run.json` `gates[]`. Certifying another agent's gate is a defect. A self-check or sub-gate is not a gate: it goes in your `review.md` or your verdict file, because any name not in `run.json` raises `UNKNOWN_GATE`. |
| `blockers` | `{ "what": "", "why": "", "needs": "<agent-name or 'shehab'>" }` |
| `missing_inputs` | Promised inputs that never arrived and that you worked around |
| `machinery_findings` | Defects in an agent file, a skill or this protocol, with the file named |
| `decisions_for_shehab` | `{ "question": "", "options": [], "recommendation": "" }`. Never a bare question. |
| `next` | The agent that should run next, `"shehab"`, or `null` at run closure |

A blocked or rejected handoff still gets written. Silence is the one status the
orchestrator cannot act on.

---

## What counts as evidence

| Counts | Does not count |
|---|---|
| Command output saved to a file | "The tests pass" |
| A response body captured from the running API | "The endpoint returns the right shape" |
| A screenshot of the actual screen at the actual width | "It looks fine on mobile" |
| A measured contrast ratio with both hex values | "The contrast should be fine" |
| A diff, a trace, a log line with a timestamp | "I checked" |
| A failing test that now passes, both runs captured | "I fixed it" |

Evidence lives under `.actio/runs/<run-id>/evidence/` and is referenced by path from the
handoff. A claim with no file behind it is a blocker, not a pass.

---

## Rejecting bad input

A downstream agent that receives bad input sends it back. It does not work around it and
it does not guess.

A rejection states four things:

1. **What** you received that is wrong or missing.
2. **Why** it blocks you, specifically. "The brief does not say what happens when the
   group is below threshold" is a rejection. "The brief is unclear" is not.
3. **What you need** to proceed, stated concretely enough to act on.
4. **Round number.** One, two or three.

Write it as a `blockers` entry with `needs` set to the upstream agent, set `status` to
`rejected`, set `next` to that agent, and write the handoff.

**Three rounds is the limit.** On the third rejection between the same two agents,
escalate instead of continuing. A loop that has not converged in three rounds is a
disagreement, not a misunderstanding, and disagreements go to the Product Lead.

---

## Escalation

Escalate to Shehab when any of these is true:

| Trigger | Why it is his |
|---|---|
| The work would change scope | Only he can change scope |
| A brand rule would have to be broken | `BRAND.md` is his, and breaking a rule is a decision, not a workaround |
| Two gates disagree | Neither gate owner can overrule the other |
| The same rejection loop has run three times | See above |
| The work would make the product contradict its own claim | Closure without evidence, reporting below threshold, routing to someone without authority |
| An action is irreversible or outward-facing and not already authorised for this run | Deploys, pushes, anything a customer sees |

Every escalation carries three things and never fewer:

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

Never a bare question. An escalation without a recommendation moves the work to Shehab's
desk without moving it forward.

---

## Hard rules for every agent

1. **No AI attribution anywhere.** No commit, tag, pull request, release note, code
   comment, document or artefact carries a co-author line, a generated-by line, or any
   mention of the tool that produced it. Absolute, and it overrides any default behaviour.
2. **Never mark work done without evidence.** "It should work" is a blocker.
3. **Never silently narrow scope.** Finish what you can and name exactly what you left.
4. **Never invent a design value.** Every colour, spacing value, radius, duration and type
   size is in `BRAND.md`. If the value you want is not there, the design is wrong, not the
   scale.
5. **Never write a number in product copy without its sample size.** Never write a status
   without its written label.
6. **Never certify a gate you do not own.**
7. **Never claim you consumed something you did not read.**
8. **The privacy invariants are code, not policy.** No group below the reporting threshold
   of 5 ever reports, a manager cannot filter below it, free text is returned reworded with
   names removed, protected cases leave the engagement queue entirely.
9. **Nothing closes without evidence.** That is the product's entire claim.
10. **You work autonomously.** Do not ask permission to run your own loop. Ask only for
    decisions that are genuinely the Product Lead's.

---

## Worked example: a filled plan

```markdown
# Plan · backend-engineer · 2026-09-20-privacy-preview

## 1. Plan

**Task.** Expose the figures the privacy preview screen needs, for the reader in front of it.

**Inputs**

| Path | Taking |
|---|---|
| tech-architect/brief-backend.md | Endpoint shape, the four figures, the error case |
| tech-architect/adr-004-reporting-threshold.md | Threshold is a system invariant, not a setting |

**Assumptions**

| Assumption | Checked | How |
|---|---|---|
| Group membership is already computed for the cycle | yes | read the cohort function in `supabase/migrations/` |
| Threshold is 5 everywhere | yes | ADR-004, and grep for the constant |

**Acceptance criteria**
1. GET returns group size, threshold, filterable fields, free-text treatment.
2. Every figure is computed for the requesting user, never illustrative.
3. A cohort below threshold returns the threshold and its own size, and nothing else.
4. The privacy invariant test module covers all three above.

**Out of scope.** The screen itself. Copy. The WhatsApp variant of this message.

**Rules**

| Rule | Source |
|---|---|
| Threshold enforced in the query layer | ADR-004 |
| Numbers are live, never illustrative | BRAND.md, the privacy preview section |

## 2. Audit of the plan

**What is missing?** The brief does not say what the endpoint returns for a user who has
already answered this cycle. Added criterion 5: it returns the same figures, because the
persistent link in every later message points here.

**What did I assume without checking?** That "filterable fields" is a fixed list rather
than per-tenant configuration. Checked: it is per-tenant. The endpoint must read it, not
hardcode it. Plan amended.

**Which Actio rule could this break?** Returning a live group size below the threshold
would itself leak. Criterion 3 already covers it, and the test module now has a case
where the cohort is exactly 4.

**What would downstream reject?** The front end needs a stable shape when the cohort is
below threshold rather than a 403, or it cannot render the screen at all. Contract
amended to return 200 with a reduced payload.

**What has nobody named?** Cohort size changes between the preview and the submission.
Raised with tech-architect as a contract question rather than deciding it here.

### Revisions

| # | Changed | Why |
|---|---|---|
| 1 | Added criterion 5 | Persistent link reuses this endpoint |
| 2 | Filterable fields read from tenant config | Assumption was wrong |
| 3 | Below-threshold returns 200, reduced payload | 403 breaks the screen |

**Verdict:** revised and re-audited, proceeding to execute. One contract question raised
with tech-architect, tracked as a blocker rather than assumed.
```
