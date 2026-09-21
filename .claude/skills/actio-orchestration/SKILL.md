---
name: actio-orchestration
description: Run planning, gate enforcement and the agent utilisation check for the Actio swarm. Use when planning a run, dispatching agents, checking whether every required agent ran and was actually used, detecting stalls or rejection loops, or closing a run with a report for the Product Lead.
---

# Orchestration

The orchestrator's toolkit. Its job is not to do the work. Its job is to prove the work was
done by the right agents, in the right order, with every gate resolved.

The question this skill exists to answer, asked after every stage: **did every agent that
should have run actually run, and was every agent that ran actually used?**

---

## run.json

Written once at the start of a run, amended only by appending to `amendments`.

```json
{
  "run": "2026-09-20-privacy-preview",
  "brief": "Add the privacy preview screen ahead of the first response in a cycle. It must show the real group size, the reporting threshold, the fields a manager can filter by, and what happens to free text.",
  "requested_by": "shehab",
  "opened": "2026-09-20T08:02:11Z",
  "definition_of_done": [
    "The screen renders at 360px in all four locales, both themes",
    "Every figure is computed for the reader, never illustrative",
    "A cohort below threshold degrades without leaking its size",
    "Privacy invariant tests cover all three above",
    "qc-lead has issued a go"
  ],
  "stages": [
    { "stage": "architecture", "agents": ["tech-architect"], "gate": "design-authority", "gate_owner": "tech-architect", "depends_on": [] },
    { "stage": "design", "agents": ["ux-designer", "ux-auditor"], "gate": "design", "gate_owner": "ux-auditor", "depends_on": ["architecture"] },
    { "stage": "copy", "agents": ["ux-writer"], "gate": "copy", "gate_owner": "ux-writer", "depends_on": ["design"] },
    { "stage": "build", "agents": ["frontend-engineer", "backend-engineer"], "gate": null, "gate_owner": null, "depends_on": ["architecture", "copy"] },
    { "stage": "review", "agents": ["peer-reviewer", "code-analyst"], "gate": "review", "gate_owner": "both", "depends_on": ["build"] },
    { "stage": "integration", "agents": ["engineering-lead"], "gate": "engineering", "gate_owner": "engineering-lead", "depends_on": ["review"] },
    { "stage": "test", "agents": ["qc-engineer"], "gate": null, "gate_owner": null, "depends_on": ["integration"] },
    { "stage": "quality", "agents": ["qc-lead"], "gate": "quality", "gate_owner": "qc-lead", "depends_on": ["test"] },
    { "stage": "release", "agents": ["release-engineer"], "gate": "release", "gate_owner": "release-engineer", "depends_on": ["quality"] }
  ],
  "out_of_scope": [
    "The WhatsApp variant of this message",
    "Changing the threshold itself"
  ],
  "amendments": []
}
```

Rules for the plan:

- Every stage names its agents, its gate, and the single agent that owns that gate.
- `review` is the one stage with two gate owners. Both must pass.
- A stage with no gate still produces handoffs. Not every stage gates; every stage records.
- Skipping an agent is a plan decision, made at planning time and written in
  `out_of_scope` with a reason. It is never a silent omission at run time.

---

## ledger.md

Append-only. One line per event. Correct an entry by appending a correction, never by
editing history.

```markdown
# Ledger · 2026-09-20-privacy-preview

| Time (UTC) | Event | Agent | Detail |
|---|---|---|---|
| 08:02:11 | run opened | orchestrator | brief from shehab |
| 08:04:40 | dispatched | tech-architect | stage: architecture |
| 08:39:02 | handoff | tech-architect | passed · gate design-authority pass · next ux-designer |
| 08:39:30 | dispatched | ux-designer | stage: design |
| 09:13:55 | handoff | ux-designer | passed · next ux-auditor |
| 09:41:55 | handoff | ux-auditor | passed · gate design pass · next ux-writer |
| 09:42:10 | utilisation check | orchestrator | 3 agents, 0 findings |
| 11:20:04 | handoff | code-analyst | rejected · needs backend-engineer · round 1 |
| 12:58:33 | handoff | code-analyst | rejected · needs backend-engineer · round 2 |
| 14:11:09 | escalated | orchestrator | rejection loop round 3, to shehab |
| 15:02:00 | correction | orchestrator | 12:58:33 was round 2 not round 3, miscounted |
```

---

## Gate table

| Gate | Owner | Passes when |
|---|---|---|
| `design-authority` | `tech-architect` | ADR written, task briefs unambiguous, no boundary eroded |
| `design` | `ux-auditor` | No blocker or major findings open, states covered, accessibility measured, survives the longest locale |
| `copy` | `ux-writer` | Every string in English and Arabic, passes the competitor check, no string concatenates a count |
| `review` | `peer-reviewer` **and** `code-analyst` | Both pass independently |
| `engineering` | `engineering-lead` | Both reviews ran and passed, it builds, it migrates, suite green, works end to end with evidence |
| `quality` | `qc-lead` | Evidence exists and shows what the log claims, untested surface named, product claims still hold |
| `release` | `release-engineer` | Pre-flight clean, go from qc-lead, rollback plan written before deploy, post-deploy smoke passed |
| `closure` | `orchestrator` | Every agent in the plan ran, was used, and resolved its gates |

A stage does not start until every gate it depends on reads pass. Enforce this before
dispatching, not after.

---

## The utilisation check

Run after every stage, and again at closure. This is the orchestrator's reason for
existing.

### The algorithm

For each agent in the run plan, in stage order:

```
1. HANDOFF EXISTS
   Does .actio/runs/<run>/<agent>/handoff.json exist?
   NO  -> finding: NEVER_RAN

2. HANDOFF PARSES
   Is it valid JSON with a status in {passed, blocked, rejected, escalated}?
   NO  -> finding: MALFORMED_HANDOFF

3. OUTPUT EXISTS
   For each path in produced[]: does it exist on disk and is it non-empty?
   NO  -> finding: PHANTOM_OUTPUT

4. OUTPUT WAS CONSUMED
   Does any later agent's handoff list one of this agent's produced[] paths
   in its consumed[]?
   NO  -> finding: UNUSED_OUTPUT
   (Exception: the last agent in the run, and evidence files, which are
    consumed by qc-lead and by Shehab rather than by a successor.)

5. INPUTS WERE REAL
   For each path in consumed[]: does it exist?
   NO  -> finding: FALSE_CONSUMPTION

6. GATES RESOLVED
   For each gate this agent owns in the plan: is there a gates[] entry with a
   result, and does its evidence path exist?
   NO  -> finding: GATE_UNRESOLVED

7. GATE OWNERSHIP
   For each gates[] entry: does the plan name this agent as its owner?
   NO  -> finding: GATE_SELF_CERTIFIED

8. NO SKIPPED DEPENDENCY
   Did this agent start before every gate in depends_on read pass?
   YES -> finding: GATE_SKIPPED
```

### Supporting commands

```bash
RUN=.actio/runs/2026-09-20-privacy-preview

# 1. which agents in the plan have no handoff
for a in $(jq -r '.stages[].agents[]' $RUN/run.json | sort -u); do
  [ -f "$RUN/$a/handoff.json" ] || echo "NEVER_RAN: $a"
done

# 2. malformed handoffs
for f in $RUN/*/handoff.json; do
  jq -e '.status | test("^(passed|blocked|rejected|escalated)$")' "$f" >/dev/null \
    || echo "MALFORMED_HANDOFF: $f"
done

# 3. produced paths that are not on disk or are empty
jq -r '.agent as $a | .produced[] | "\($a)\t\(.)"' $RUN/*/handoff.json |
while IFS=$'\t' read -r a p; do
  [ -s "$p" ] || echo "PHANTOM_OUTPUT: $a -> $p"
done

# 4. produced paths that nobody later consumed
ALL_CONSUMED=$(jq -r '.consumed[]' $RUN/*/handoff.json | sort -u)
jq -r '.agent as $a | .produced[] | "\($a)\t\(.)"' $RUN/*/handoff.json |
while IFS=$'\t' read -r a p; do
  case "$p" in */evidence/*) continue;; esac
  echo "$ALL_CONSUMED" | grep -qxF "$p" || echo "UNUSED_OUTPUT: $a -> $p"
done

# 5. consumed paths that do not exist
jq -r '.agent as $a | .consumed[] | "\($a)\t\(.)"' $RUN/*/handoff.json |
while IFS=$'\t' read -r a p; do
  [ -e "$p" ] || echo "FALSE_CONSUMPTION: $a -> $p"
done

# 7. gates certified by an agent the plan does not name as owner
jq -r '.agent as $a | .gates[]? | "\($a)\t\(.name)"' $RUN/*/handoff.json |
while IFS=$'\t' read -r a g; do
  owner=$(jq -r --arg g "$g" '.stages[] | select(.gate==$g) | .gate_owner' $RUN/run.json)
  [ "$owner" = "$a" ] || [ "$owner" = "both" ] || echo "GATE_SELF_CERTIFIED: $a claimed $g, owner is $owner"
done
```

### The failure taxonomy

| Finding | Means | Do this |
|---|---|---|
| `NEVER_RAN` | An agent in the plan produced no handoff | Dispatch it. If it was deliberately skipped, that belongs in `out_of_scope` with a reason, so amend the plan and say so. |
| `MALFORMED_HANDOFF` | Status missing or not one of the four | Send it back to the agent. Do not infer the status. |
| `PHANTOM_OUTPUT` | An agent claimed a file it did not write | Block. This is a falsified record, not a typo. Re-dispatch and say why. |
| `UNUSED_OUTPUT` | Somebody did work nobody read | Find out which. Either the downstream agent skipped its input, or the work was not needed and the plan was wrong. Both are findings. |
| `FALSE_CONSUMPTION` | An agent listed an input that does not exist | Block. It did not read what it says it read. |
| `GATE_UNRESOLVED` | A gate has no result, or its evidence path is missing | The gate has not passed. Do not proceed on an unresolved gate. |
| `GATE_SELF_CERTIFIED` | An agent passed a gate it does not own | Void the gate. Dispatch the real owner. |
| `GATE_SKIPPED` | A stage started before its dependency passed | Stop the run. Re-run the stage after the gate resolves, because its inputs were not valid. |
| `REJECTION_LOOP` | The same reject between the same two agents three times | Escalate to Shehab. Do not dispatch a fourth round. |
| `IDLE_AGENT` | Work is queued for an agent with no handoff and no blocker | Dispatch it, or record why it is not needed. |

### Reporting findings

Always as a table, always blocking, never buried in prose.

```markdown
## Utilisation check · after stage `review` · 2026-09-20T13:02:44Z

| Finding | Agent | Detail | Action |
|---|---|---|---|
| UNUSED_OUTPUT | ux-writer | `ux-writer/strings.ar.json` appears in no consumed list | frontend-engineer built the screen without the Arabic catalogue. Re-dispatch frontend-engineer. |
| GATE_UNRESOLVED | code-analyst | gate `review` has no entry | code-analyst ran but did not certify. Send back. |

**Run status: blocked.** 2 findings. Stage `integration` will not be dispatched.
```

The orchestrator never marks a gate pass on another agent's behalf, and never proceeds
past a finding because the finding looks minor.

---

## Detecting stalls and loops

| Signal | Check |
|---|---|
| Rejection loop | Count `blockers[].needs` pointing at the same agent across handoffs from the same source. Three is the limit. |
| Stall | A dispatched agent with no handoff and no blocker. Ask it for a status; if it has no plan file either, it never started. |
| Ping-pong | Two agents each rejecting to the other. Neither is wrong; the contract between them is. Route to `tech-architect`, or escalate if it is a scope question. |
| Silent scope narrowing | An agent's `produced` covers less than its task brief asked for, and no blocker explains the gap. This is the one the ledger catches and nothing else does. |

---

## The run report

Written at closure, for Shehab. Plain, specific, no summary language.

```markdown
# Run report · 2026-09-20-privacy-preview

**Brief.** Add the privacy preview screen ahead of the first response in a cycle.
**Status.** Released. 1 decision was yours, 1 item is knowingly untested.

## What changed

| Surface | Change |
|---|---|
| `GET /api/cycles/<id>/privacy-preview/` | New. Returns live group size, threshold, filterable fields, free-text treatment. |
| Privacy preview screen | New. Shown ahead of the first response, and from the persistent link in every later message. |

## Who did what

| Agent | Produced | Gate |
|---|---|---|
| tech-architect | ADR-004, 2 task briefs | design-authority: pass |
| ux-designer | spec, 7 states | — |
| ux-auditor | 11 findings, 11 closed | design: pass |
| ux-writer | 24 strings, EN and AR | copy: pass |
| frontend-engineer | 6 files | — |
| backend-engineer | 9 files, privacy invariant suite | — |
| peer-reviewer | 4 comments, 4 resolved | review 1 of 2: pass |
| code-analyst | 7 findings, 6 fixed, 1 accepted | review 2 of 2: pass |
| engineering-lead | integration evidence | engineering: pass |
| qc-engineer | 38 cases, 3 defects filed and fixed | — |
| qc-lead | readiness report | quality: go |
| release-engineer | deployed, tagged v0.4.0 | release: pass |

## Utilisation

13 of 13 agents ran. 0 findings at closure. Every produced artefact was consumed.

## What needs you

| Decision | Options | Recommendation | Your call |
|---|---|---|---|
| Cohort size can change between the preview and submission | Recompute at submit and warn, or freeze at preview | Freeze at preview. The preview is a promise, and a number that moves after you read it is worse than one that is slightly stale. | **Freeze** |

## Knowingly untested

| What | Why | Risk |
|---|---|---|
| Tagalog on a physical handset | No device available this cycle | Low. String lengths verified in the emulator, but the brand rule asks for a physical device, so this is open. |
```
