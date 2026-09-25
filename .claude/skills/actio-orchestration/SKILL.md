---
name: actio-orchestration
description: Run planning, gate enforcement and the agent utilisation check for the Actio swarm. Use when planning a run, dispatching agents, checking whether every required agent ran and was actually used, detecting stalls or rejection loops, or closing a run with a report for the Product Lead.
---

# Orchestration

The orchestrator's toolkit. Its job is not to do the work. Its job is to prove the work was
done by the right agents, in the right order, with every gate resolved.

The question this skill exists to answer, asked after every stage: **did every agent that
should have run actually run, and was every agent that ran actually used?**

**The orchestrator runs as the main thread and is the only dispatcher.** Every dispatch
has to land in the ledger and in the utilisation check, and one made by any other role
would not. `.claude/settings.json` sets
`"agent": "orchestrator"`, and `claude --agent orchestrator` does the same explicitly.
Every other agent is a subagent of the orchestrator: it hands off with `next` and
`blockers[].needs`, and the orchestrator does the routing.

---

## Toolchain pre-flight, at run open

Run it before the first dispatch, after the `run opened` ledger line. The toolchain is git,
node 24, npm, npx and the Supabase MCP server (`supabase` in `.mcp.json`, scoped to one
project). Nothing else may be assumed, and the swarm does not depend on Docker, the Supabase
CLI, Deno, the Vercel CLI, pnpm, psql, jq or python. The full statement is in `CLAUDE.md`,
and the database workflow is in `actio-supabase`.

| Check | How | Answered means |
|---|---|---|
| node | `node --version` | A version string, 24 or later |
| npm | `npm --version` | A version string |
| Supabase MCP | One `list_tables` call, the cheapest read the server has | A table list, even an empty one. A missing tool or an auth error is a no. |

The orchestrator carries `mcp__supabase__list_tables` in its tools line for this check only.
It never applies, queries or changes the database.

Write the three results with the shell timestamp to `evidence/toolchain-preflight.log`, cite
it in the orchestrator's handoff, and log a `toolchain pre-flight` ledger line.

| Result | Do this |
|---|---|
| All three answer | Dispatch as planned. |
| node or npm missing | Stop and escalate to Shehab. No stage can run. |
| The MCP does not answer | Record `supabase MCP not authorised` in the ledger and in the orchestrator's `blockers`, escalate to Shehab, who authorises it with `/mcp`, and dispatch no database stage until a re-run of the check answers. Still dispatch every stage that does not need it. |

A database stage is any plan entry whose task needs the Supabase MCP to apply, prove, type or
inspect something on the project. `backend-engineer` and `release-engineer` always are. Any
other agent that carries `mcp__supabase` in its tools line is one when its task needs the
project rather than the offline proof; decide which at planning time and write it in the
orchestrator's `plan.md`. An agent that finds the MCP missing mid-run runs
the offline PGlite proof (`npm run db:test`) and hands off `blocked` with the same reason,
and that routes to Shehab the same way. A missing tool is reported as blocked, never faked.

---

## run.json

Written once at the start of a run, amended only by appending to `amendments`. The one
exception is `gates[].result` and `gates[].evidence`, which only `.actio/bin/sync-gates.mjs`
writes, copying each owner's own record out of its handoff (BUG-0027).

```json
{
  "run": "2026-09-20-privacy-preview",
  "brief": "Add the privacy preview screen ahead of the first response in a cycle. It must show the real group size, the reporting threshold, the fields a manager can filter by, and what happens to free text.",
  "opened": "2026-09-20T08:02:11Z",
  "ships": true,
  "done_means": [
    "The screen renders at 360px in all four locales, both themes",
    "Every figure is computed for the reader, never illustrative",
    "A cohort below threshold degrades without leaking its size",
    "Privacy invariant tests cover all three above",
    "qc-lead has issued a go"
  ],
  "out_of_scope": [
    "The WhatsApp variant of this message",
    "Changing the threshold itself"
  ],
  "plan": [
    { "stage": 1, "agent": "bug-historian", "task": "Regression brief: what has already broken on these surfaces", "consumes": ["run.json"], "produces": ["bug-historian/brief.md"], "blocked_by": [] },
    { "stage": 1, "agent": "tech-architect", "task": "ADR and task briefs for this change", "consumes": ["run.json", "bug-historian/brief.md"], "produces": ["tech-architect/adr-NNNN-<slug>.md", "tech-architect/brief-frontend.md", "tech-architect/brief-backend.md"], "blocked_by": [] },
    { "stage": 2, "agent": "ux-designer", "task": "Design spec, every surface and every state", "consumes": ["tech-architect/brief-frontend.md", "bug-historian/brief.md"], "produces": ["ux-designer/spec.md", "ux-designer/string-slots.json"], "blocked_by": ["design-authority"] },
    { "stage": 2, "agent": "backend-engineer", "task": "Supabase: schema, RLS policies, functions, Edge Functions", "consumes": ["tech-architect/brief-backend.md", "bug-historian/brief.md"], "produces": ["<source paths>"], "blocked_by": ["design-authority"] },
    { "stage": 3, "agent": "ux-auditor", "task": "Independent audit of the design spec", "consumes": ["ux-designer/spec.md", "bug-historian/brief.md"], "produces": ["ux-auditor/findings.md"], "blocked_by": [] },
    { "stage": 4, "agent": "ux-writer", "task": "English and Arabic strings for every new surface", "consumes": ["ux-designer/spec.md", "ux-designer/string-slots.json", "ux-auditor/findings.md", "bug-historian/brief.md"], "produces": ["ux-writer/strings.md", "ux-writer/strings-en.json", "ux-writer/strings-ar.json"], "blocked_by": ["design"] },
    { "stage": 5, "agent": "frontend-engineer", "task": "React and Next.js implementation", "consumes": ["tech-architect/brief-frontend.md", "ux-designer/spec.md", "ux-writer/strings-en.json", "ux-writer/strings-ar.json", "bug-historian/brief.md"], "produces": ["<source paths>"], "blocked_by": ["design", "copy"] },
    { "stage": 6, "agent": "peer-reviewer", "task": "Senior review: judgement, boundaries, failure modes", "consumes": ["<source paths>", "bug-historian/brief.md"], "produces": ["peer-reviewer/verdict.json", "peer-reviewer/comments.md"], "blocked_by": [] },
    { "stage": 6, "agent": "code-analyst", "task": "Line-by-line defects, security, structural rot", "consumes": ["<source paths>", "bug-historian/brief.md"], "produces": ["code-analyst/findings.md"], "blocked_by": [] },
    { "stage": 6, "agent": "code-steward", "task": "Clean code: naming, shape, module headers, comments, maintainability", "consumes": ["<source paths>", "bug-historian/brief.md"], "produces": ["code-steward/findings.md"], "blocked_by": [] },
    { "stage": 6, "agent": "security-analyst", "task": "Security sweep: secrets, exposure, authorisation, injection, dependencies, robustness", "consumes": ["<source paths>", "bug-historian/brief.md"], "produces": ["security-analyst/findings.md", "evidence/security/"], "blocked_by": [] },
    { "stage": 7, "agent": "bug-historian", "task": "Regression guard: was a known defect repeated", "consumes": ["bug-historian/brief.md", "<source paths>"], "produces": ["bug-historian/guard.md", "evidence/regression/"], "blocked_by": ["review-1of3", "review-2of3", "review-3of3", "security"] },
    { "stage": 8, "agent": "engineering-lead", "task": "Integration: does it work end to end", "consumes": ["peer-reviewer/verdict.json", "peer-reviewer/comments.md", "code-analyst/findings.md", "code-steward/findings.md", "security-analyst/findings.md", "bug-historian/guard.md"], "produces": ["engineering-lead/verdict.md", "evidence/build.log"], "blocked_by": ["review-1of3", "review-2of3", "review-3of3", "security", "regression-guard"] },
    { "stage": 9, "agent": "qc-engineer", "task": "Test API, privacy, flows, accessibility, locales, regression", "consumes": ["engineering-lead/verdict.md", "bug-historian/brief.md"], "produces": ["qc-engineer/test-log.md", "qc-engineer/defects.md", "evidence/<test artefacts>"], "blocked_by": ["engineering"] },
    { "stage": 10, "agent": "qc-lead", "task": "Evidence audit and independent final pass", "consumes": ["qc-engineer/test-log.md", "qc-engineer/defects.md", "evidence/<test artefacts>"], "produces": ["qc-lead/readiness.md"], "blocked_by": [] },
    { "stage": 11, "agent": "release-engineer", "task": "Release: pre-flight, migrations through the Supabase MCP, build, tag, push, verify", "consumes": ["qc-lead/readiness.md"], "produces": ["release-engineer/preflight.md", "release-engineer/deploy-log.md", "release-engineer/release-note.md", "release-engineer/rollback.md", "evidence/release/"], "blocked_by": ["quality"] },
    { "stage": 12, "agent": "bug-historian", "task": "Record: every defect and agent mistake raised in this run, into BUGS.md", "consumes": ["qc-engineer/defects.md", "qc-lead/readiness.md", "bug-historian/guard.md"], "produces": ["bug-historian/record.md"], "blocked_by": ["release"] }
  ],
  "gates": [
    { "name": "design-authority", "owner": "tech-architect", "blocks": ["ux-designer", "backend-engineer"], "result": "pending" },
    { "name": "design", "owner": "ux-auditor", "blocks": ["ux-writer", "frontend-engineer"], "result": "pending" },
    { "name": "copy", "owner": "ux-writer", "blocks": ["frontend-engineer"], "result": "pending" },
    { "name": "review-1of3", "owner": "peer-reviewer", "blocks": ["engineering-lead"], "result": "pending" },
    { "name": "review-2of3", "owner": "code-analyst", "blocks": ["engineering-lead"], "result": "pending" },
    { "name": "review-3of3", "owner": "code-steward", "blocks": ["engineering-lead"], "result": "pending" },
    { "name": "security", "owner": "security-analyst", "blocks": ["engineering-lead"], "result": "pending" },
    { "name": "regression-guard", "owner": "bug-historian", "blocks": ["engineering-lead"], "result": "pending" },
    { "name": "engineering", "owner": "engineering-lead", "blocks": ["qc-engineer"], "result": "pending" },
    { "name": "quality", "owner": "qc-lead", "blocks": ["release-engineer"], "result": "pending" },
    { "name": "release", "owner": "release-engineer", "blocks": [], "result": "pending" },
    { "name": "run-closure", "owner": "orchestrator", "blocks": [], "result": "pending" }
  ],
  "utilisation": []
}
```

Rules for the plan:

- One `plan` entry per agent, not per stage. Two agents sharing a stage number run
  concurrently once both are due, which is how `peer-reviewer`, `code-analyst`,
  `code-steward` and `security-analyst` stay independent.
- An entry is due when every gate in its `blocked_by` reads `pass` **and** every path in its
  `consumes` is on disk. That is why `tech-architect` shares stage 1 with `bug-historian`
  but still waits for `bug-historian/brief.md`.
- `consumes` and `produces` in the plan are what the utilisation check measures the actual
  handoffs against. A plan entry with an empty `produces` cannot be verified, so fill it in
  even where the paths are placeholders.
- `blocked_by` names gates, never agents. A stage starts when every gate it names reads
  `pass`.
- The twelve gate names are canonical and come from the gate table in `docs/WORKFLOW.md`.
  **Never rename one for a run**, because the owner writes the same name back in its
  handoff and the check matches on it literally.
- Skipping an agent is a plan decision, made at planning time and written in
  `out_of_scope` with a reason. It is never a silent omission at run time.
- Amend the plan by appending a new entry and recording the amendment in `ledger.md`.
  Never edit a plan entry in place once the run has started.

---

## ledger.md

Append-only. One line per event. Correct an entry by appending a correction, never by
editing history.

```markdown
# Ledger · 2026-09-20-privacy-preview

| Time (UTC) | Event | Agent | Detail |
|---|---|---|---|
| 08:02:11 | run opened | orchestrator | brief from shehab |
| 08:03:05 | toolchain pre-flight | orchestrator | node, npm and the Supabase MCP answered · evidence/toolchain-preflight.log |
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

A run starts with a `run opened` line and ends with a `run closed` line, both written by the
orchestrator.

---

## Gate table

Twelve gates. These literal names go into `run.json` and come back in each owner's handoff.

| Gate | Owner | Passes when |
|---|---|---|
| `design-authority` | `tech-architect` | ADR written, task briefs unambiguous, no boundary eroded |
| `design` | `ux-auditor` | No blocker or major findings open, states covered, accessibility measured, survives the longest locale |
| `copy` | `ux-writer` | Every string in English and Arabic, passes the competitor check, no string concatenates a count |
| `review-1of3` | `peer-reviewer` | The change solves the brief's problem, sits in the right layer, failure modes handled |
| `review-2of3` | `code-analyst` | No defect above the severity threshold, no security finding, no complexity breach |
| `review-3of3` | `code-steward` | The clean code checklist is worked in full with evidence, and no blocker or major readability finding is open |
| `security` | `security-analyst` | Every applicable pass in `actio-security` ran with evidence, no critical or high open, audits clean or accepted in writing, no secret in tree or history, every client-reachable table has RLS with a policy, no `service_role` outside Edge Function secrets |
| `regression-guard` | `bug-historian` | No known defect on these surfaces repeated, each checked by running its detection command, and every binding standing rule checked with its result recorded |
| `engineering` | `engineering-lead` | All three reviews, the security gate and the regression guard ran and passed, it builds, it migrates, suite green, `get_advisors` clean for security and performance or every finding accepted in writing, works end to end with evidence |
| `quality` | `qc-lead` | Evidence exists and shows what the log claims, untested surface named, product claims still hold |
| `release` | `release-engineer` | Pre-flight clean, go from qc-lead, rollback plan written before the first migration is applied, migrations applied through the Supabase MCP and verified with `list_migrations`, `get_advisors` clean, `npm run build` green, tagged and pushed to origin main, post-release smoke passed. Front-end hosting recorded as `deferred: no target chosen`, which is not a failure |
| `run-closure` | `orchestrator` | Every agent in the plan ran, was used, and resolved its gates |

The three review gates and the security gate are separate names rather than one gate with
four owners, so the check can tell which reviewer is outstanding instead of reporting a
single ambiguous failure. `regression-guard` is the only gate whose owner also runs at the start of the run:
`bug-historian` publishes the brief in stage 1, and the guard checks it was honoured.

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
   Is there a handoff paired to this plan entry's stage (handoff.json for the first pass,
   handoff-stage<N>.json for a later one)? Pair by stage, never by counting files.
   NO, and the run is closing, or a later plan entry planned to consume its
       output has handed off       -> finding: NEVER_RAN
   NO, and its gates pass and its inputs are on disk
                                   -> PENDING: due now, dispatch it
   NO, otherwise                   -> PENDING: waiting on the named gates and inputs

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
   For each gates[] entry: is the gate in run.json gates[] at all?
   NO  -> finding: UNKNOWN_GATE
   Does the plan name this agent as its owner?
   NO  -> finding: GATE_SELF_CERTIFIED

8. NO SKIPPED DEPENDENCY
   Did this agent start before every gate in blocked_by read pass?
   YES -> finding: GATE_SKIPPED

9. THE LOOP WAS WORKED
   Is there a non-empty plan.md with an Audit section, and a non-empty review.md?
   NO  -> finding: LOOP_SKIPPED

10. TIMING IS COHERENT
   Is started at or before finished?
   NO  -> finding: NO_TIMING
```

### Running it

The check is implemented at `.actio/bin/utilisation-check.mjs` and that file is the only
thing you run. The check reads gate results from `run.json`, so sync them from the owners'
handoffs first, every time:

```bash
node .actio/bin/sync-gates.mjs .actio/runs/<run-id>
node .actio/bin/utilisation-check.mjs .actio/runs/<run-id>
```

Skipping the sync leaves every gate `pending`, so no blocked stage ever becomes due and the
run stalls. The sync copies an owner's latest record and never decides a gate.

It exits 0 when clean and 1 when anything is found, so `run-closure` can depend on it. Add
`--json` for the machine-readable form.

The algorithm above is the specification; the script is the implementation. One source, one
reference, never two copies (R-03). If you change one, change the other in the same commit.

It separates **PENDING** from a finding: an agent whose gates have not passed, or whose
inputs are not yet on disk, has not failed to run, and an artefact nobody has consumed yet
because its planned consumer has not been dispatched is not an unused output. Without that
separation the check raises a finding against every agent in the plan when run at run open,
which is what made it unusable anywhere but closure.

### Supporting commands, for reference

This section used to carry a shell version of each step, written in `jq`. The swarm does not
use `jq`, so a line copied from it failed, and a second copy of the check broke R-03 in any
case. It is gone. To read one field by hand, parse the JSON with node:

```bash
node -e "const r = require('./.actio/runs/<run-id>/run.json'); for (const g of r.gates) console.log(g.name, g.owner, g.result)"
```

Anything more than one field is the script's job.

### The failure taxonomy

| Finding | Means | Do this |
|---|---|---|
| `NEVER_RAN` | A plan entry has no handoff paired to its stage, and the run has moved past it: a later plan entry planned to consume its output has handed off, or run-closure is recorded. A due entry still waiting for its dispatch is PENDING, not this. | Dispatch it. If it was deliberately skipped, that belongs in `out_of_scope` with a reason, so amend the plan and say so. |
| `MALFORMED_HANDOFF` | Status missing or not one of the four | Send it back to the agent. Do not infer the status. |
| `PHANTOM_OUTPUT` | An agent claimed a file it did not write | Block. This is a falsified record, not a typo. Re-dispatch and say why. |
| `UNUSED_OUTPUT` | Somebody did work nobody read | Find out which. Either the downstream agent skipped its input, or the work was not needed and the plan was wrong. Both are findings. |
| `FALSE_CONSUMPTION` | An agent listed an input that does not exist | Block. It did not read what it says it read. |
| `GATE_UNRESOLVED` | A gate has no result, or its evidence path is missing | The gate has not passed. Do not proceed on an unresolved gate. |
| `GATE_SELF_CERTIFIED` | An agent passed a gate it does not own | Void the gate. Dispatch the real owner. |
| `GATE_SKIPPED` | A stage started before its dependency passed | Stop the run. Re-run the stage after the gate resolves, because its inputs were not valid. |
| `UNKNOWN_GATE` | A handoff or a `blocked_by` names a gate that is not in `run.json` | Send it back. The gate names are canonical and are never renamed for a run. |
| `LOOP_SKIPPED` | No `plan.md` with an Audit section, or no `review.md` | Send it back. The deliverable without the loop is not accepted. |
| `NO_TIMING` | `started` is after `finished`, or either is missing where required | Send it back. Timestamps come from the shell. |
| `STALLED` | A dispatched agent with no handoff and no blocker | Ask it for a status. If it has no plan file either, it never started, so re-dispatch. |
| `ORPHAN_EVIDENCE` | A file in `evidence/` that no handoff cites | A test ran and nobody read the result. Route it to the agent whose gate it belongs to. |
| `REJECTION_LOOP` | The same reject between the same two agents three times | Escalate to Shehab. Do not dispatch a fourth round. |
| `IDLE_AGENT` | Work is queued for an agent with no handoff and no blocker | Dispatch it, or record why it is not needed. |

### Reporting findings

Always as a table, always blocking, never buried in prose.

```markdown
## Utilisation check · after stage `review` · 2026-09-20T13:02:44Z

| Finding | Agent | Detail | Action |
|---|---|---|---|
| UNUSED_OUTPUT | ux-writer | `ux-writer/strings-ar.json` appears in no consumed list | frontend-engineer built the screen without the Arabic catalogue. Re-dispatch frontend-engineer. |
| GATE_UNRESOLVED | code-analyst | gate `review-2of3` has no entry | code-analyst ran but did not certify. Send back. |

**Run status: blocked.** 2 findings. Stage `integration` will not be dispatched.
```

The orchestrator never marks a gate pass on another agent's behalf, and never proceeds
past a finding because the finding looks minor.

---

## Detecting stalls and loops

| Signal | Check |
|---|---|
| Rejection loop | Count `blockers[].needs` pointing at the same agent across handoffs from the same source. Three is the limit. |
| Stall (`STALLED`) | A dispatched agent with no handoff and no blocker. Ask it for a status; if it has no plan file either, it never started. |
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
| ux-designer | spec, 7 states | – |
| ux-auditor | 11 findings, 11 closed | design: pass |
| ux-writer | 24 strings, EN and AR | copy: pass |
| frontend-engineer | 6 files | – |
| backend-engineer | 9 files, privacy invariant suite | – |
| peer-reviewer | 4 comments, 4 resolved | review-1of3: pass |
| code-analyst | 7 findings, 6 fixed, 1 accepted | review-2of3: pass |
| code-steward | 5 findings, 5 fixed | review-3of3: pass |
| security-analyst | 2 findings, 2 fixed, audits clean | security: pass |
| bug-historian | brief, guard, 1 new entry | regression-guard: pass |
| engineering-lead | integration evidence | engineering: pass |
| qc-engineer | 38 cases, 3 defects filed and fixed | – |
| qc-lead | readiness report | quality: go |
| release-engineer | migrations applied through the MCP, tagged v0.4.0, pushed, hosting deferred: no target chosen | release: pass |

## Utilisation

15 of 15 agents ran. 0 findings at closure. Every produced artefact was consumed.

## What needs you

| Decision | Options | Recommendation | Your call |
|---|---|---|---|
| Cohort size can change between the preview and submission | Recompute at submit and warn, or freeze at preview | Freeze at preview. The preview is a promise, and a number that moves after you read it is worse than one that is slightly stale. | **Freeze** |

## Knowingly untested

| What | Why | Risk |
|---|---|---|
| Tagalog on a physical handset | No device available this cycle | Low. String lengths verified in the emulator, but the brand rule asks for a physical device, so this is open. |
```
