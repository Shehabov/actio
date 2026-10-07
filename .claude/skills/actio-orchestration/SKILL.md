---
name: actio-orchestration
description: Run planning, gate enforcement and the agent utilisation check for the Actio swarm. Use when planning a run, dispatching agents, checking whether every required agent ran and was actually used, detecting stalls or rejection loops, or closing a run with a report for the Product Lead.
---

# Orchestration

The question, after every stage: **did every agent that should have run actually run, and was every agent that ran actually used?** Scripts do the bookkeeping (`.actio/bin/run.mjs`, `sync-gates.mjs`, `utilisation-check.mjs`, the ledger hook); the orchestrator does the judgement. The loop, handoff schema and toolchain are in `actio-agent-protocol`.

The orchestrator is the main thread (`.claude/settings.json` sets `"agent": "orchestrator"`) and the only dispatcher: a dispatch it did not make never reaches the ledger or the check. Everyone else hands off with `next` and `blockers[].needs`. One run per session. Its context is the scarcest resource in a run: never read a full artefact when a script line or a handoff field will do, never paste a report.

## Lanes

Pick the lane from the files the change will touch and write why in `lane_reason`; Shehab can override. A lane is the rule "delete the stages this change does not touch and record each in `out_of_scope`", pre-written in `.actio/TEMPLATE/lanes/<lane>.json`. A gate whose owner is not in the plan is absent from `gates` and named in `out_of_scope`.

| Lane | When | Plan |
|---|---|---|
| `micro` | No file under `web/`, `extension/`, `supabase/`, `.actio/bin/`, no `package*.json`: docs, agent definitions, skills, config | brief → maker (tech-architect) → peer-reviewer ∥ security-analyst ∥ guard → release-engineer (commit, push; migrations n/a) → record |
| `standard-ui` | `web/` or `extension/`, nothing under `supabase/` | All roles but backend-engineer |
| `standard-db` | `supabase/`, nothing under `web/` or `extension/` | All roles but ux-designer, ux-auditor, frontend-engineer. ux-writer runs beside backend-engineer and `copy` blocks engineering-lead |
| `full` | Both tracks, or anything touching the privacy invariants (I1 to I4), RLS, grants, auth, the issue state machine or evidence closure | All 16 roles |

Tailor before the first dispatch and record each change in `out_of_scope` or `lane_reason`:
- micro keeps security-analyst only when `.claude/settings.json`, `.mcp.json`, an agent's `tools:` line, permissions, hooks or secrets are touched. Otherwise delete its entry, the `security` gate, and both from release-engineer's `blocked_by` and `consumes`.
- micro's maker is tech-architect; when the surface is another role's (strings: ux-writer; a design spec: ux-designer), swap the agent and its gate.
- standard-db: delete ux-writer and `copy` when no user-visible string (error, template) changes.
- A run that ships nothing: `open ... --no-ships`.

A leftover reference fails loudly (`UNKNOWN_GATE`, or a stage that never comes due).

## Flow v2

| Stage | Agents (∥ parallel) | Starts when |
|---|---|---|
| 1 | bug-historian brief (script, `bugs.mjs brief`) | run open |
| 1 | tech-architect | its brief slice exists |
| 2 | ux-designer ∥ backend-engineer | `design-authority` |
| 3 | ux-auditor ∥ ux-writer | the designer's handoff. The writer works from `string-slots.json` without waiting for `design`; a slot change from the audit is a delta pass |
| 4 | frontend-engineer | `design`, `copy` (optional scaffold pass after `design-authority`) |
| 5 | peer-reviewer ∥ code-analyst ∥ code-steward ∥ security-analyst ∥ bug-historian guard (script, `bugs.mjs guard`) | the makers' handoffs; the guard re-runs on each new snapshot |
| 6 | engineering-lead, runs `verify.mjs` once | the five stage-5 gates |
| 7 | qc-engineer, reuses the verify bundle | `engineering` |
| 8 | qc-lead | qc-engineer's handoff |
| 9 | release-engineer | `quality` |
| 10 | bug-historian record (`bugs.mjs next-id`, `open-index`) | `release` |
| close | orchestrator: `report.md`, `run-closure` | the record |

Paths per stage are fixed in the lane templates. Gate names never change; the canonical table is `docs/WORKFLOW.md`.

## run.json v2

`version: 2`, `run`, `lane`, `lane_reason`, `brief`, `opened`, `ships`, `done_means`, `out_of_scope`, `plan`, `gates` (`name`, `owner`, `blocks`, `result`), `amendments`, `utilisation`. A plan entry is one pass of one agent:

| Field | Holds |
|---|---|
| `stage`, `agent`, `task` | Flow v2 stage; the agent; what this pass must do for this run |
| `consumes`, `produces` | Run-relative paths (repo paths for source); `<...>` and `NNNN` are patterns until known |
| `blocked_by` | Gate names, never agents |
| `read`, `brand`, `accept` | Files to read first; `BRAND.md` sections (`"§1"`); acceptance criteria from `done_means` |
| `model` | `null` uses the agent's frontmatter; a name overrides it |

An entry is due when every `blocked_by` gate reads `pass` or `n/a` and every `consumes` path is on disk (a handoff counts once it leaves `working`). Only `sync-gates.mjs` writes `gates[].result` (BUG-0027). After the first dispatch, amend only by appending an entry and a ledger row; never edit one in place. Skipping an agent is a planning decision in `out_of_scope`, never a silent omission.

## run.mjs

| Command | Does |
|---|---|
| `open <slug> --lane <lane> [--no-ships]` | Creates the run from the lane template, sets `.actio/runs/.active`, runs the scriptable pre-flight, lists what to fill |
| `next [<run>]` | Gate sync, the compact check, gates, findings, due stages with their model; appends a `utilisation check` row |
| `dispatch <run> <agent> [--stage N]` | Prints the dispatch prompt from the plan entry, the brief slice inlined. Never writes the ledger |
| `ledger <run> <event> <agent> <detail...>` | Appends one clock-stamped row |
| `handoff <path>` | Validates a handoff; exit 0 valid |
| `snapshot <run>` | Commits the whole tree to `refs/actio/snapshots/<run>/<n>`, never touching index, tree or stash; prints the sha |
| `close <run> [--confirm]` | Whether `run-closure` can pass and what is missing; `--confirm` appends `run closed`, clears `.active` |

## Opening a run

1. `run.mjs open <slug> --lane <lane>`. Grep `.actio/runs/*/run.json` for the surface; read the `report.md` of any match.
2. Fill `brief` (Shehab's words), `lane_reason`, `done_means` (each checkable against a file, log or screenshot), `out_of_scope`, every `task` and `accept`; extend `read` and `brand`; tailor the lane. Clear every placeholder `open` lists.
3. Pre-flight: `open` logged node, npm and the Playwright line to `evidence/toolchain-preflight.log`. Make one Supabase `list_tables` call (that tool's only use), append its result to the log, `run.mjs ledger` it.
4. Answer your `## Pre-mortem` as `Risk:` lines in `orchestrator/handoff.json`, then run the stage routine.

| Pre-flight | Do this |
|---|---|
| node or npm missing | Stop and escalate: no stage can run |
| Supabase MCP silent | Ledger and `blockers`: `supabase MCP not authorised`; escalate; no database stage until a re-check answers |
| Playwright MCP silent | Likewise, `playwright MCP not answering`; every stage runs (gate evidence is the suite) |

A database stage is one whose task needs the project: backend-engineer and release-engineer always, any other `mcp__supabase` carrier when its task needs the project rather than PGlite (say so in its `task`).

## The stage routine (at most four tool calls per boundary)

`run.mjs next` → `run.mjs dispatch` for each due stage → every due Agent call in one message → on return, `run.mjs next`. Read a handoff only to decide a rejection or an escalation, and then only `status`, `gates`, `findings`, `blockers` (a `node -e` line or `next`'s output). Advisory findings never on their own justify a dispatch.

- Send `dispatch`'s output plus run-specific notes only; pass paths, never another agent's text.
- bug-historian first: nobody plans without the brief, and each agent cites its slice.
- The four reviewers never see another's verdict before all four are filed; none covers for another.
- Strings, numerals, states, colour, spacing, motion or RTL route through ux-writer and ux-auditor, whoever wrote the change.
- A rejection or `GATE_STALE`: the author fixes, then the gate owners re-review the delta (`dispatch` prints the range).
- Resume: an agent cut off mid-task (usage limit, `maxTurns`) is resumed with its context (`SendMessage`) when the harness allows; otherwise re-dispatched with an instruction to continue from its `working` handoff and its files on disk.

## The utilisation check

`run.mjs next` runs `sync-gates.mjs` then `utilisation-check.mjs --compact`. The script implements this table; change both together (R-03). PENDING (gates or inputs not ready, a consumer not yet dispatched) is not a finding.

| Code | Class | Means | Do this |
|---|---|---|---|
| `NEVER_RAN` | blocking | No handoff for an entry the run has moved past | Dispatch it, or amend the plan |
| `MALFORMED_HANDOFF` | blocking | Unparseable, a bad status, `n/a` without a reason | Send back; never infer |
| `PHANTOM_OUTPUT` | blocking | A `produced` path missing or empty | A falsified record: re-dispatch, say why |
| `GATE_UNRESOLVED` | blocking | No result, or its evidence missing | Do not proceed |
| `GATE_SELF_CERTIFIED` | blocking | Certified by a non-owner | Void it; dispatch the owner |
| `GATE_SKIPPED` | blocking | Ran while a `blocked_by` gate was unresolved | Re-run that stage after the gate |
| `UNKNOWN_GATE` | blocking | A name not in `run.json` | Send back; names are canonical |
| `GATE_STALE` | blocking | engineering-lead, qc-lead or release-engineer due, and a code gate judged an older snapshot than the latest maker's | Delta re-review by that owner |
| `UNUSED_OUTPUT` | advisory | Planned output its consumer did not cite | Report: skipped input or unneeded work |
| `FALSE_CONSUMPTION` | advisory | `consumed` names a missing path | Send back next pass |
| `LOOP_SKIPPED` | advisory | No `Risk:` line in `plan[]`, or `passed` without `checks[]` | Send back |
| `NO_TIMING` | advisory | `started` or `finished` missing or reversed | Send back |

Judged by the orchestrator from the ledger and the tree:

| Code | Signal | Do this |
|---|---|---|
| `STALLED` | `dispatched` with no `returned`, or returned with only a `working` handoff | Resume it |
| `REJECTION_LOOP` | Same reject, same two agents, three times | Escalate; no fourth round |
| `IDLE_AGENT` | Due work with no dispatch | Dispatch, or record why not |
| `ORPHAN_EVIDENCE` | A file in `evidence/` no handoff cites | Route it to its gate owner |

Also watch for ping-pong (two agents rejecting each other: the contract is wrong; route to tech-architect) and silent scope narrowing (`produced` covers less than the task, no blocker says why). Clear a finding by fixing its cause, never by editing it or calling it minor.

## Ledger

`ledger.md` under `# Ledger · <run-id>`, append-only, `| Time (UTC) | Event | Agent | Detail |`, full ISO timestamps. The hook writes `dispatched` and `returned`; `run.mjs` writes `run opened`, `toolchain pre-flight`, `utilisation check`; the orchestrator writes `gate`, `reject`, `finding`, `escalate`, `decision`, `correction`, `run closed` through `run.mjs ledger`. Correct by appending a `correction`; never edit or reorder.

```markdown
| 2026-10-07T08:39:02Z | returned | tech-architect | auto · handoff .../tech-architect/handoff.json · status passed |
| 2026-10-07T11:20:04Z | reject | orchestrator | code-analyst to frontend-engineer · CA-2 major · round 1 |
```

## The run report

`report.md` at closure, for Shehab: plain, specific, no summary language. Sections: **Brief** and **Status** (one line each, counting his decisions and the untested items) · What changed (surface, change) · Who did what (agent, produced, gate and result) · Utilisation (agents run of planned; blocking and advisory at closure; unconsumed outputs named) · What needs you (decision, options, recommendation) · Knowingly untested (what, why, risk) · Gates certified by their own producer (BUG-0028). Then `orchestrator/handoff.json` with `run-closure`, and `run.mjs close <run> --confirm`.

## References

| File | Read when |
|---|---|
| `references/run-report-example.md` | Writing `report.md` |
| `references/v1-orchestration.md` | A run's `run.json` has no `"version": 2` |
| `.actio/TEMPLATE/lanes/<lane>.json` | Tailoring a lane, or a plan path is in doubt |
