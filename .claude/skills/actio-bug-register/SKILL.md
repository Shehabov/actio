---
name: actio-bug-register
description: Capture defects and agent mistakes in BUGS.md, turn each into a standing rule, and brief the swarm at the start of every run so the same bug is not committed twice. Use when a defect is found or raised, when a run opens and the agents need their regression brief, and when checking a diff against everything that has already gone wrong on that surface.
---

# The bug register

`BUGS.md` at the repository root is the register; `bug-historian` is its only writer. A
repeated defect is worse than a new one: a new defect means something was hard, a repeated one
means the register was written and nobody read it. The loop, handoff schema and toolchain are
in `actio-agent-protocol`.

## The two jobs, and the guard that enforces them

| Job | When | How | Output |
|---|---|---|---|
| Brief | Stage 1, before any agent plans | `bugs.mjs brief`, then at most 10 judgement lines | `bug-historian/brief.md` (60 lines), `bug-historian/brief/<agent>.md` (20 lines each) |
| Guard | Stage 5, beside the four reviews, on the maker snapshot | `bugs.mjs guard`, then judgement | `bug-historian/guard.md` (40 lines), `evidence/regression/guard.json` |
| Record | When a defect is raised, and at stage 10 | Entries in the v2 layout | `BUGS.md` |

The brief is the job that matters: recording without briefing is an archive, not a control.
The guard makes it binding, since it runs every selected detection whether or not an agent
read its slice. The script reads `BUGS.md`; you read in full only the entries you write or
judge.

## The CLI: `node .actio/bin/bugs.mjs <command>`

| Command | Use |
|---|---|
| `index [--json]` | Every entry parsed: status, class, kind, tags, binds, rules, detections, size, problems |
| `surfaces --paths <p...>` or `--base <ref>` | Paths to surface tags |
| `brief --run <id>` with `--paths`, `--surfaces a,b` or `--base <ref>` | Writes the brief and a slice per planned agent; prints live repeat patterns and gaps |
| `guard --run <id> --base <ref> [--head <snapshot>]` | Every selected detection at head and base, in parallel, timed out. Exit 0 clean, 1 repeat, 2 judgement |
| `proof <BUG-NNNN> --bad <ref> --good <ref>` | Fires on the defect, silent on the fix (R-11, R-13) |
| `next-id` | Next BUG id (an id referenced anywhere is taken); next R and T ids on stderr |
| `open-index` | The `## Open` table derived from the Status rows, to paste |
| `lint [--strict]` | Size caps, dead detections, dangling ids, Open mismatch, unmapped tags, missing history, legacy layout |

All take `--root <repo>` and `--register <path>`. The vocabulary is `.actio/bugs/surfaces.json`
(yours): closed `tags` with globs, `aliases` for legacy `Surface` text, `class_tags`,
`entry_tags`. A path with no tag is a gap there: add the glob, never guess in the brief.

## Recording a defect

1. **Id.** `bugs.mjs next-id`. Never reused or renumbered. Entries close; none disappears.
2. **Every row** of the v2 layout (`references/entry-template.md`), `none` where empty:
   - `Agent at fault` is routing, not blame. Where the brief, spec or a skill was wrong
     rather than the implementer, name that role.
   - `Class` from `## Classes` in `BUGS.md`; check I1 to I8 before `privacy-invariant` or
     `state-machine`. `Surfaces` (closed tags) and `Binds` drive every later brief.
   - **The rule this produces** is a class, not an incident. "Do not pass the field name into
     `BelowThreshold`" is an incident note; "an error raised by a privacy invariant states the
     invariant, never the input that tripped it" is a rule.
   - **One `detect` block**: runnable with the protocol's toolchain, read-only, aimed at the
     surface's stack (SQL under `supabase/`, TypeScript under `web/` and `extension/`,
     Markdown under `.claude/` and `docs/`), proved with `bugs.mjs proof`. No entry without a
     detection; where no command can decide, a `judgement:` line states the question.
3. **Why it got through**, not why it happened. Name the gate that should have caught it:

   | The defect passed | So the finding is |
   |---|---|
   | `peer-reviewer`, `code-analyst`, `code-steward` | The review rubric has a hole. Name it |
   | `security-analyst` | The catalogue or its sweep has a hole. Name the pass |
   | the regression guard | The detection did not catch it. Fix the detection |
   | `qc-engineer` | The test matrix has a hole. Name the untested surface |
   | `ux-auditor` | The audit checklist has a hole |
   | no gate, found in production | Which gate should have owned it |

   A gate skipped rather than failed is class `process`, and it escalates.
4. **Standing rule** when it would prevent a class of defect, not one instance: `R-NN`, the
   entry it came from, the agents it binds. `every agent` makes it universal (briefed in every
   run): only when it binds every role. A rule outranks instinct, never `BRAND.md` or an ADR.
5. **Repeat check.** `bugs.mjs index --json`: same `Class` plus the same component or surface,
   and the same shape elsewhere. Set `Repeat of`. Two occurrences is a `## Repeat offenders`
   row. **A third escalates to Shehab** as a process failure: the reading is the problem.
6. **Size.** At most 40 lines and 2.5 KB; dated paragraphs go to
   `.actio/bugs/history/BUG-NNNN.md`. A corrected detection replaces the block in place and
   the old block moves, dated, to the history file.
7. **Derived tables.** Paste `bugs.mjs open-index` into `## Open`; never type it (BUG-0018).
   `bugs.mjs lint` shows no finding from your entries.

## Recording an agent mistake

Behaviour, not code: the agent did what its own file forbids. Class `agent-behaviour`,
recorded the first time. It outweighs a code defect, because it repeats on every surface the
agent touches. The universal rules carry these into every brief.

| Mistake | Looks like |
|---|---|
| Invented a value | A hex, spacing, duration or type size not in `BRAND.md` |
| Cited from memory | A section number, token name or ratio not checked against the file |
| Marked work done without evidence | `status: passed` with empty or unverifiable `produced` or `checks` |
| Narrowed scope silently | Less than the brief, with no blocker naming the gap |
| Certified another agent's gate | A `gates[]` entry for a gate it does not own |
| Claimed a false input | A `consumed` path it did not read, or that does not exist |
| Papered over bad input | Worked around a broken handoff instead of rejecting it |
| Added attribution | Any co-author or generated-by line, anywhere |
| Skipped the pre-mortem | A handed-off `plan[]` with no `Risk:` line |

## What not to record

Padding stops the register being read.

- A defect caught and fixed inside one agent's own pass, before any handoff, unless it
  reveals a rule.
- A style preference a formatter owns.
- A one-off environment failure with no product cause.
- A duplicate: add an occurrence to the existing entry instead.

## Reviewing the register (every record pass)

- [ ] Every defect raised this run (guard repeats, QC findings, handoffs'
      `machinery_findings` and `blockers`, Shehab) has an entry or a stated reason.
- [ ] Every entry that generalises has produced a standing rule.
- [ ] `## Repeat offenders` is current; any pattern at three occurrences is escalated.
- [ ] Every entry closed this run names where it was fixed, in its history file.
- [ ] Open entries no longer reproducible are closed with a reason, never deleted.
- [ ] Every new or corrected detection printed `two-sided`.
- [ ] `open-index` pasted, `lint` clean for this run's entries, `next-id` agrees.

## References

| File | Read when |
|---|---|
| `references/entry-template.md`: v2 entry, detect grammar, modules, proof, history file, legacy conversion | Before writing or correcting any entry |
| `references/brief-and-guard.md`: choosing tags, selection, judgement lines, guard states and verdict | Brief pass before judgement lines; guard pass whenever it exits 2 |
| `BUGS.md` `## Entry format`, `## Classes` | Before classifying |
| `.claude/skills/actio-architecture/SKILL.md` `## System invariants` | Before writing `privacy-invariant` or `state-machine` |
