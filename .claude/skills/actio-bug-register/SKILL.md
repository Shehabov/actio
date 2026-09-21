---
name: actio-bug-register
description: Capture defects and agent mistakes in BUGS.md, turn each into a standing rule, and brief the swarm at the start of every run so the same bug is not committed twice. Use when a defect is found or raised, when a run opens and the agents need their regression brief, and when checking a diff against everything that has already gone wrong on that surface.
---

# The bug register

`BUGS.md` at the repository root is the register. This skill is how it is kept and how it
is used. `bug-historian` is the only agent that writes to it.

The register exists because a repeated defect is worse than a new one. A new defect means
something was hard. A repeated defect means the register was written and nobody read it.

---

## The two jobs

| Job | When | Output |
|---|---|---|
| **Brief** | At the start of every run, before any agent plans | `.actio/runs/<run-id>/bug-historian/brief.md`, addressed to the named agents |
| **Record** | When a defect is raised, and again at run close | A new or updated entry in `BUGS.md`, plus a standing rule if the defect generalises |

The brief is the job that matters. Recording without briefing is an archive, not a
control.

---

## Recording a defect

### 1. Assign an id

`BUG-NNNN`, four digits, never reused, never renumbered. Take the next number from the
register. Entries are append-only: a closed defect stays in the file forever.

### 2. Fill the block

Use the exact format in `BUGS.md`. Every field is filled or explicitly marked `none`. The
four that carry the weight:

| Field | What good looks like |
|---|---|
| `Agent at fault` | The role whose output carried the defect. Where the brief or the spec was wrong rather than the implementer, name that role instead. This is routing, not blame, and it must be accurate or the brief goes to the wrong agent. |
| `Class` | From the taxonomy in `BUGS.md`. It is what makes the register searchable. |
| `The rule this produces` | The generalised lesson, written so it applies beyond this one case. "Do not pass the field name into `BelowThreshold`" is an incident note. "An error raised by a privacy invariant states the invariant, never the input that tripped it" is a rule. |
| `How to detect it next time` | A concrete check, ideally a runnable command. Without this the entry teaches nothing an agent can act on. |

### 3. Write "why it got through"

Not "why it happened". **Why it got through.** Every defect passed some number of gates
that should have caught it, and naming which gate failed is how the process improves
rather than only the code.

| The defect passed | So the finding is |
|---|---|
| `peer-reviewer` and `code-analyst` | The review rubric has a hole. Name it. |
| `qc-engineer` | The test matrix has a hole. Name the surface that was untested. |
| `ux-auditor` | The audit checklist has a hole. |
| No gate, it was found in production | Which gate *should* have owned it? |

Where the answer is that a gate was skipped rather than that it failed, the class is
`process` and it escalates.

### 4. Promote to a standing rule where it generalises

A rule earns its place in the standing rules table when it would prevent a class of
defect, not one instance. Give it `R-NN`, name the defect it came from, and name the
agents it binds.

**A standing rule outranks an agent's instinct.** That is the point of writing it down.

### 5. Check for a repeat

Search the register for the same `Class` plus the same `Component`, and for the same
shape of mistake across different components. Two occurrences makes it a repeat pattern,
recorded in the repeat offenders table. **A third occurrence is escalated to Shehab as a
process failure**, because at that point the register is not the problem, the reading of
it is.

---

## The regression brief

Written at the start of every run, before any agent plans. This is the coaching function.

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
| BUG-0007 | Below-threshold error named the filter that caused it | backend-engineer | grep for `raise BelowThreshold`, confirm no call site passes a field name |

## Repeat patterns live in this run

Two entries share the pattern "a shared vocabulary defined in two files and allowed to
drift". This run changes the issue state machine, which is defined in `actio-architecture`
and implemented in `issues/models.py`. **One of those is the source. Say which in the ADR
before either is edited.**

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

Rules for the brief:

- **Address agents by name.** A brief addressed to nobody is read by nobody.
- **Only include what binds this run.** Filter by surface and component. A brief that
  lists every defect ever is skipped, and then the one that mattered is skipped with it.
- **Lead with the standing rules**, because they bind regardless of surface.
- **Name the detection command**, so the agent can check rather than remember.
- Where nothing in the register touches this run, say exactly that. A short honest brief
  keeps the long ones credible.

---

## The regression guard

Run after the reviews and before the engineering gate. This is `bug-historian`'s gate,
`regression-guard`.

For every entry in the brief:

1. Run its `How to detect it next time` command against the diff.
2. Record the command and its output as evidence.
3. Where it fires, the defect has been repeated. File it as a repeat, set the gate to
   fail, and route it back to the agent at fault with the original entry attached.

For every standing rule that binds this run:

1. State how you checked it.
2. State the result.

The gate passes when no known defect was repeated and every binding rule was checked with
evidence. It is not a judgement call: an unchecked rule is a fail, the same as a broken
one.

---

## Recording an agent mistake

Distinct from a code bug, and the register carries both. An agent mistake is behaviour:
the agent did something its own file tells it not to do.

Class is `agent-behaviour`. Common ones, and each is recorded the first time it happens:

| Mistake | Looks like |
|---|---|
| Invented a value | A hex, spacing, duration or type size not in `BRAND.md` |
| Cited from memory | A section number, a token name or a ratio not checked against the file |
| Marked work done without evidence | A handoff with `status: passed` and an empty or unverifiable `produced` |
| Narrowed scope silently | Delivered less than the brief with no blocker naming the gap |
| Certified another agent's gate | A `gates[]` entry for a gate it does not own |
| Claimed a false input | A `consumed` path it did not read, or that does not exist |
| Papered over bad input | Worked around a broken handoff instead of rejecting it |
| Added attribution | Any co-author or generated-by line, anywhere |
| Skipped the plan audit | A `plan.md` with no step 2, or a step 2 with no revisions and no statement that none were needed |

These matter more than single code defects, because a behaviour repeats across every
surface the agent touches rather than in one file.

---

## What not to record

The register is only useful while it is read, and it stops being read when it is padded.

- A defect caught and fixed inside one agent's own loop, before any handoff. That is the
  loop working. Record it only if it reveals a rule.
- A style preference a formatter owns.
- A one-off environment failure with no product cause.
- A duplicate. Add an occurrence to the existing entry instead.

---

## Reviewing the register

At every run close, `bug-historian` checks:

- [ ] Every defect raised this run has an entry.
- [ ] Every entry that generalises has produced a standing rule.
- [ ] The repeat offenders table is current.
- [ ] Any pattern now at three occurrences is escalated to Shehab.
- [ ] Every entry closed this run names where it was fixed.
- [ ] Open entries that are no longer reproducible are closed with a reason, never deleted.
