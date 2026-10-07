---
name: actio-agent-protocol
description: "The operating loop every Actio agent follows (read the dispatch, plan with a Risk line and checkpoint, execute, self-check, hand off), the handoff v2 schema validated by run.mjs handoff, the toolchain and what to do when a tool is missing, what counts as evidence, the rejection protocol (blocker and major only, round 3 escalates), escalation to Shehab, and the hard rules. Use at the start of any task performed by an Actio agent, before planning or touching a file."
---

# The Actio agent protocol

The one copy of the loop, handoff schema and toolchain. Any standing rules in your brief slice bind every task. `references/worked-example.md`: when `run.mjs handoff` rejects yours.

## The loop

1. **Read the dispatch** and its named inputs, nothing else. Read a `BRAND.md` section before citing it.
2. **Plan, audit, checkpoint.** Write the handoff: `status: working`, `started`, `plan[]` (approach, missing criteria, unchecked assumptions, one `Risk:` line per `## Pre-mortem` question in your agent file: the failure and your response). Resumes start here. No `plan.md` (a long maker pass may keep 40 lines).
3. **Execute.** Write deliverables to disk as you go.
4. **Self-check.** Each criterion into `checks[]` with evidence. Fix failures; the rest are blockers. No `review.md`.
5. **Hand off.** Rewrite the handoff; `node .actio/bin/run.mjs handoff <path>` until exit 0. Final message at most 8 lines: status, gate and result, next, blockers, handoff path. Never paste artefacts or logs.

Findings live in the handoff, documents where the dispatch names them, evidence in `evidence/`. A later pass writes `handoff-stage<N>.json`. If resumed, continue from your `working` handoff. Never dispatch: set `next`.

## Speed

Produce within three tool calls. Batch independent calls in one message. One script over many reads (`run.mjs`, `bugs.mjs`, `verify.mjs`, `git diff --stat`). No repository tours. Stop when criteria are met and evidenced: no gold-plating, no extras, no essays. Never redo a check a gate evidenced on the same snapshot; cite it.

## Handoff v2

```json
{"run":"<id>","agent":"code-analyst","stage":5,"status":"passed","started":"<iso>","finished":"<iso>","reviewed":"<sha>",
"consumed":["<path>"],"produced":["<path>"],"gates":[{"name":"review-2of3","result":"pass","evidence":"<path>"}],
"plan":["<approach>","Risk: <failure>; <response>"],"checks":[{"criterion":"<c>","result":"pass","evidence":"<p>"}],
"findings":[{"id":"CA-1","severity":"minor","where":"<file:line>","rule":"<class>","what":"<w>","fix":"<f>","status":"fixed"}],
"blockers":[],"missing_inputs":[],"machinery_findings":[],"decisions_for_shehab":[],"next":"engineering-lead"}
```

| Field | Rule |
|---|---|
| `stage`, `status` | The plan entry's stage. `working` (never final), `passed`, `blocked`, `rejected`, `escalated` |
| `started`, `finished` | ISO UTC from the shell; no `finished` while `working` |
| `reviewed` | `run.mjs snapshot` sha: makers, the tree handed off; owners of `design`, `review-*`, `security`, `regression-guard`, `engineering`, `quality` (required), the newest maker snapshot judged |
| `consumed`, `produced` | One plain path each, only what you read or wrote; `produced` exists, non-empty; cite your slice |
| `gates` | Yours only, canonical: `pass`, `fail`, `n/a` with `reason` |
| `plan`, `checks` | 1 to 6 lines, one `Risk:`; at least one check when `passed` |
| `findings` | `blocker`, `major`, `minor`, `nit`; `open`, `fixed`, `accepted`; `what` ≤240 chars; `fix` optional (never ux-auditor's) |
| `blockers` | `{what, why, needs}`: an agent or `shehab` |
| `missing_inputs`, `machinery_findings` | Inputs worked around; machinery defects, file named |
| `decisions_for_shehab`, `next` | `{question, options[], recommendation}`; an agent, `shehab`, `null` at closure |

Size: soft 4 KB, hard 12 KB.

## Toolchain

Available: git, node 24, npm, npx, the Supabase MCP (one project), the Playwright MCP (qc-engineer, qc-lead). Never a step or evidence: Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, `jq` (use `node -e`). Python 3.14.7 and Django 6.1.1 are installed on the machine by the Product Lead's decision of 2026-09-27. They are not part of the stack, and are not a step, a gate criterion, an evidence source or an allowed dependency of any stage.

- A missing tool is `blocked`, never faked. Supabase MCP: run `npm run db:test` (PGlite), reason `supabase MCP not authorised`. Playwright MCP: run the suite, reason `playwright MCP not answering`. Shehab restores either with `/mcp`.
- Never write a file through a Bash heredoc: it hangs. Use Write.
- Time: `date -u +%Y-%m-%dT%H:%M:%SZ`.

## Evidence

| Counts | Does not |
|---|---|
| Command output in a file, a response body, a screenshot at the width, a contrast ratio with both hex values, a diff or trace, a failing test then passing | "Tests pass", "looks fine", "I checked", "I fixed it" |

A claim with no file is a blocker.

## Rejection

Bad input goes back: a `blockers` entry with what is wrong, why it blocks you (specifically), what you need, and the round (1 to 3); `status: rejected`, `next` upstream. Only `blocker` and `major` reject; `minor` and `nit` are fixed in-pass or `accepted`. Re-reviews read `git diff <old> <new>` snapshots plus open findings. Round 3 escalates.

## Escalation

| To Shehab via `decisions_for_shehab`, never a bare question, when |
|---|
| Scope would change, or a `BRAND.md` rule would break |
| Two gates disagree; a rejection loop or defect pattern reaches 3 |
| The product would contradict its claim (closure without evidence, reporting below threshold, routing without authority) |
| An irreversible or outward action is not authorised for this run |

## Hard rules

1. No AI attribution anywhere. 2. No pass without evidence; no silent scope cuts. 3. No invented design value. 4. A number in copy carries its sample size, a status its label. 5. Certify only your gates; cite only what you read. 6. Privacy is code: nothing below 5 reports or is filtered to; free text reworded, names removed; protected cases leave the queue. 7. Nothing closes without evidence. 8. Work autonomously; ask Shehab only his decisions.
