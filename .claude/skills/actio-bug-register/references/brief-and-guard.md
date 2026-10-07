# Brief and guard: what the script writes and how to judge it

Read at the brief pass before adding judgement lines, and at the guard pass whenever
`bugs.mjs guard` exits 2. The script's contract is the header of `.actio/bin/bugs.mjs`.

## How a run's tags are chosen

The brief needs the surfaces the run will touch, before anything is changed. Use, in order:

1. `--paths <p...>` for the files the run's task names (from `run.json`: `brief`, `lane_reason`,
   the plan's task text). `bugs.mjs surfaces --paths <p...>` shows the mapping first.
2. `--surfaces a,b` for tags the task implies but no path names yet (a new migration is `db`;
   a new queue screen is `web, issues`). Tags come only from `.actio/bugs/surfaces.json`.
3. `--base <ref>` when the run already has changes (a re-brief, a catch-up). It reads the diff
   and the untracked files.

The options union. Too wide is cheaper than too narrow: an entry selected wrongly costs one
row; an entry missed is a repeat nobody was warned about.

## What the brief selects (A3)

An entry is selected when its surface tags, or the tags its `Class` maps to in `class_tags`,
intersect the run's tags, or a changed path is named in its `Component` cell. Two filters:

- A machinery entry (all its tags `kind: machinery`) never binds a run with no machinery tag.
  Product runs never carry swarm doctrine entries.
- An `agent-behaviour` entry is never a row: the ten universal rules carry it.

Rules: the universal rules (Binds `every agent`) head every brief and slice in one line each.
A scoped rule is selected when its tags intersect, or it cites a selected entry.

Rows are ordered open first, surface matches before class matches, then severity. What does
not fit the 60-line cap is listed by id on an overflow line; the guard still runs all of it.

## Your judgement lines (brief.md, at most 10)

Replace `- none yet` under `## Judgement`. Only what the tags could not see:

- an entry on another surface that binds by pattern (the escalated patterns R-03, R-08, R-09,
  R-11 and R-13 cross surfaces);
- a live repeat pattern the script printed, said as the trap this run could fall into;
- an entry the selection included that cannot bind this run, with the reason;
- a raised-not-registered T-row on these surfaces.

Each line names the agent it is for. If none apply, leave `- none yet` as `- none`.
The slices are not edited by hand; when a judgement line binds one agent, it reaches the
agent through brief.md, which the dispatch names beside the slice.

## Guard states (guard.json `detections[].state`)

| State | Meaning | What you do |
|---|---|---|
| `silent` | Healthy at head | Nothing |
| `fixed` | Fires at base, silent at head | Note it; the record pass may close an open entry |
| `repeat` | Closed entry, a hit new at head | Exit 1. Gate fails. Route to the agent at fault with the entry attached |
| `pre-existing` | Closed entry fires identically at base and head | Not this change's repeat. Confirm the lines are identical, state it in `checks[]`, and raise a recurrence (or a detection that is not silent on healthy state, R-13) for the record pass |
| `open-present` | Open entry, unchanged hits | Expected while open |
| `open-spread` | Open entry, new hits at head | This change spreads a known defect: treat as a repeat unless the new lines are the same code moved |
| `hit-base-unknown` | Fires at head; base did not run | Undecided. Re-run with a longer `--timeout`, or decide by reading the base file. Never pass in silence |
| `error` | Exit 2+, 127 or timeout | Not a pass. Check the rule by another stated method and raise the broken detection |
| `not-runnable` | Placeholder, unsafe, wrong stack, fragment, missing path | As `error` |
| `secondary-fires` | A legacy non-current candidate fires new | Decide which detection is current; if the defect is real, it is a repeat |
| `prose-only`, `no-detection` | Legacy entry with no runnable command | Read the diff against the entry's prose; state the paths read and the result |
| `judgement` | A `judgement:` line in a detect block | Answer the question with evidence |

Rules: each binding rule is checked through the detections of the entries it came from. A rule
with no runnable detection is listed for judgement: state per rule the check you made (the
command, the paths read) or cite another gate's evidence for the same snapshot (A6.6).

## Verdict

| Exit | Verdict | Gate |
|---|---|---|
| 0 | clean | `regression-guard` pass |
| 1 | repeat | fail; reject to the agent at fault |
| 2 | judgement needed | pass only when every item is decided in `checks[]` with evidence; any item left undecided is a fail (an unchecked rule is a fail) |

`--only` and `--dry` runs are self-checks, never a gate result. After a review causes a fix,
run the full guard again on the new snapshot and rewrite `handoff-stage5.json`.

## Judgement lines: an example

The v1 brief below was hand-written; its layout is now generated. Its `## Per agent` section
is the kind of line the judgement section carries: the trap, named for the agent who can fall
into it.

```markdown
# Regression brief · 2026-10-02-issue-reassignment

**Surfaces this run touches.** api/issues, queue, issue card

## Standing rules that bind this run

| # | Rule | Binds |
|---|---|---|
| R-01 | An error raised by a privacy invariant states the invariant, never the input that tripped it. | backend-engineer, code-analyst, qc-engineer |
| R-04 | A value that is not on the spacing scale or the type scale is not written, even when it looks right. | ux-designer, frontend-engineer |

## Prior defects on these surfaces

| Id | What | Agent at fault | Detect with |
|---|---|---|---|
| BUG-0007 | Below-threshold error named the filter that caused it | backend-engineer | `git grep -n "below_threshold" supabase/migrations/`, confirm no `raise exception` passes a field name |

## Repeat patterns live in this run

Two entries share the pattern "a shared vocabulary defined in two files and allowed to
drift". This run changes the issue state machine, which is defined in `actio-architecture`
and implemented in a migration under `supabase/migrations/`. **One of those is the source.
Say which in the ADR before either is edited.**

## Per agent

**backend-engineer.** R-01 binds you. BUG-0007 was yours, on this exact surface. Before
you hand off, run the detection command in that entry against your diff.

**code-analyst.** BUG-0007 got past review because the invariant was tested on the data
path and not the error path. Read error paths on every invariant this run touches.

**frontend-engineer.** R-04 binds you. BUG-0005 was an off-scale value that looked right.

**qc-engineer.** The hole BUG-0007 exposed was a test that asserted the request was
refused without asserting what the refusal said. Assert on error bodies, not only status
codes.
```
