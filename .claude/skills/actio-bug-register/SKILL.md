---
name: actio-bug-register
description: "The BUGS.md register of defects in product code (web/, extension/, supabase/, shipped content) and its commands; agent and swarm mistakes are out of scope. Use at stage 1 to brief the swarm (bugs.mjs brief), at stage 5 to run the regression guard beside the four reviews (bugs.mjs guard, gate regression-guard, repeats and unchecked rules fail), and at stage 10 or when a product defect is raised to record an entry, its standing rule and a two-sided detection (bugs.mjs next-id, proof, open-index, lint). An empty register briefs the surfaces only and the guard exits 0. bug-historian is the only writer."
---

# The bug register

`BUGS.md` at the repository root is the register of defects in product code and shipped
content; `bug-historian` is its only writer. It starts empty and fills as product code ships.
A repeated defect is worse than a new one: a new defect means something was hard, a repeated
one means the register was written and nobody read it. The loop, handoff schema and toolchain
are in `actio-agent-protocol`.

## Scope

In: a defect in `web/`, `extension/`, `supabase/` or shipped content (`content/strings/`, the
brand assets as shipped), found by QC, a review, the guard or Shehab. Out: what an agent did
wrong while working, a skipped gate, a swarm script or skill wording fault, an environment
failure. Those go in the handoff's `machinery_findings` for the orchestrator, never here.

## The three jobs

| Job | When | How | Output |
|---|---|---|---|
| Brief | Stage 1, before any agent plans | `bugs.mjs brief`, then at most 10 judgement lines | `bug-historian/brief.md` (60 lines), `bug-historian/brief/<agent>.md` (20 lines each) |
| Guard | Stage 5, beside the four reviews, on the maker snapshot | `bugs.mjs guard`, then judgement | `bug-historian/guard.md` (40 lines), `evidence/regression/guard.json` |
| Record | When a product defect is raised, and at stage 10 | Entries in the layout of `references/entry-template.md` | `BUGS.md` |

The brief is the job that matters: recording without briefing is an archive, not a control.
The guard makes it binding, since it runs every selected detection whether or not an agent
read its slice. The script reads `BUGS.md`; you read in full only the entries you write or
judge. With no entries, the brief carries the tagged surfaces and nothing else, and the guard
exits 0 with no detections: that is a pass with evidence, not a skipped gate.

## The CLI: `node .actio/bin/bugs.mjs <command>`

| Command | Use |
|---|---|
| `index [--json]` | Every entry parsed: status, class, tags, binds, rules, detections, size, problems |
| `surfaces --paths <p...>` or `--base <ref>` | Paths to surface tags |
| `brief --run <id>` with `--paths`, `--surfaces a,b` or `--base <ref>` | Writes the brief and a slice per planned agent; prints live repeat patterns and gaps |
| `guard --run <id> --base <ref> [--head <snapshot>]` | Every selected detection at head and base, in parallel, timed out. Exit 0 clean, 1 repeat, 2 judgement |
| `proof <BUG-NNNN> --bad <ref> --good <ref>` | Fires on the defect, silent on the fix |
| `next-id` | Next BUG id (an id referenced anywhere is taken); next rule id on stderr |
| `open-index` | The `## Open` table derived from the Status rows, to paste |
| `lint [--strict]` | Size caps, dead detections, dangling ids, Open mismatch, unmapped tags, missing history |

All take `--root <repo>` and `--register <path>`. The vocabulary is `.actio/bugs/surfaces.json`
(yours): closed `tags` with globs, `aliases`, `class_tags`. A path with no tag is a gap there:
add the glob, never guess in the brief.

## Recording a defect

1. **Id.** `bugs.mjs next-id`. Never reused or renumbered. Entries close; none disappears.
2. **Every row** of the layout (`references/entry-template.md`), `none` where empty:
   - `Agent at fault` is routing, not blame. Where the brief or spec was wrong rather than
     the implementer, name that role.
   - `Class` from `## Classes` in `BUGS.md`; check I1 to I8 before `privacy-invariant` or
     `state-machine`. `Surfaces` (closed tags) and `Binds` drive every later brief.
   - **The rule this produces** is a class, not an incident. "Do not pass the field name into
     the threshold error" is an incident note; "an error raised by a privacy invariant states
     the invariant, never the input that tripped it" is a rule.
   - **One `detect` block**: runnable with the protocol's toolchain, read-only, aimed at the
     surface's stack (SQL under `supabase/`, TypeScript under `web/` and `extension/`, JSON
     under `content/`), proved with `bugs.mjs proof`. No entry without a detection; where no
     command can decide, a `judgement:` line states the question.
3. **Why it got through**, not why it happened. Name the gate that should have caught it:

   | The defect passed | So the finding is |
   |---|---|
   | `peer-reviewer`, `code-analyst`, `code-steward` | The review rubric has a hole. Name it |
   | `security-analyst` | The catalogue or its sweep has a hole. Name the pass |
   | the regression guard | The detection did not catch it. Fix the detection |
   | `qc-engineer` | The test matrix has a hole. Name the untested surface |
   | `ux-auditor` | The audit checklist has a hole |
   | no gate, found in production | Which gate should have owned it |

   A gate skipped rather than failed is not a register entry: tell the orchestrator.
4. **Standing rule** when it would prevent a class of defect, not one instance: the next rule
   id from `next-id`, the entry it came from, the agents it binds. `every agent` makes it
   universal (briefed in every run): only when it binds every role. A rule outranks instinct,
   never `BRAND.md` or an ADR.
5. **Repeat check.** `bugs.mjs index --json`: same `Class` plus the same component or surface,
   and the same shape elsewhere. Set `Repeat of`. Two occurrences is a `## Repeat offenders`
   row. **A third escalates to Shehab**: the reading is the problem.
6. **Size.** At most 40 lines and 2.5 KB; dated paragraphs go to
   `.actio/bugs/history/BUG-NNNN.md`. A corrected detection replaces the block in place and
   the old block moves, dated, to the history file.
7. **Derived tables.** Paste `bugs.mjs open-index` into `## Open`; never type it.
   `bugs.mjs lint` shows no finding from your entries.

## What not to record

Padding stops the register being read.

- Anything that is not a defect in product code or shipped content (see Scope).
- A defect caught and fixed inside one agent's own pass, before any handoff, unless it
  reveals a rule.
- A style preference a formatter owns.
- A one-off environment failure with no product cause.
- A duplicate: add an occurrence to the existing entry instead.

## Reviewing the register (every record pass)

- [ ] Every product defect raised this run (guard repeats, QC findings, Shehab) has an entry
      or a stated reason.
- [ ] Every entry that generalises has produced a standing rule.
- [ ] `## Repeat offenders` is current; any pattern at three occurrences is escalated.
- [ ] Every entry closed this run names where it was fixed, in its history file.
- [ ] Open entries no longer reproducible are closed with a reason, never deleted.
- [ ] Every new or corrected detection printed `two-sided`.
- [ ] `open-index` pasted, `lint` clean for this run's entries, `next-id` agrees.

## References

| File | Read when |
|---|---|
| `references/entry-template.md`: entry layout, detect grammar, modules, proof, history file | Before writing or correcting any entry |
| `references/brief-and-guard.md`: choosing tags, selection, judgement lines, guard states and verdict | Brief pass before judgement lines; guard pass whenever it exits 2 |
| `BUGS.md` `## Entry format`, `## Classes` | Before classifying |
| `.claude/skills/actio-architecture/SKILL.md` `## System invariants` | Before writing `privacy-invariant` or `state-machine` |
