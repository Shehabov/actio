# ADR template

Read when writing or superseding an ADR. This is the one ADR shape: it replaces the two
that `tech-architect.md` and `actio-architecture` used to carry (R-03).

One file per decision. Numbered, immutable once accepted. Supersede rather than edit.

Path: `docs/architecture/adr/ADR-NNNN-<slug>.md`, four digits, sequential, never reused.
This is the record and the only file you edit: `.actio/runs/` is gitignored, so an ADR
written only into the run folder is lost. At hand-off, copy it byte for byte to the path the
run plan tracks, `tech-architect/adr-NNNN-<slug>.md`, prove the copy with `cmp`, and never
edit the copy.

Numbers are sequential and never reused. An accepted ADR is immutable. To change a
decision, write a new ADR and mark the old one `Superseded by ADR-NNNN`. Never edit an
accepted ADR except to add that line. One decision per ADR: an ADR that carries several
decisions is several ADRs. It records the decision and its reasons, not the build steps,
which belong in the brief; aim for at most about 8 KB.

Every heading is required, even when the answer is short. The date comes from the shell,
never invented.

```markdown
# ADR-NNNN · <the decision, as a sentence>

- **Status.** Proposed | Accepted | Superseded by ADR-NNNN
- **Date.** <yyyy-mm-dd, from the shell>
- **Run.** <run id>
- **Invariants touched.** <I-numbers, or none>
- **Supersedes.** <ADR-NNNN or none>
- **Superseded by.** none

## Context

What forced a decision. The constraint, not the preference.

## Options considered

| Option | Consequence | Verdict |
|---|---|---|
| <option> | <what it makes easy and hard> | rejected because <reason> |
| <option> | <what it makes easy and hard> | chosen |

## Decision

One paragraph, in the present tense, in domain language.

## Consequences

- Good: <what this makes easy>
- Bad: <what this makes hard, and who pays for it>
- Migration: <what has to change in code or data, or "none">

## What would make us revisit

The specific condition, measurable.
```

## Worked example

```markdown
# ADR-0004 · The reporting threshold is a system invariant, not a setting

- **Status.** Accepted
- **Date.** 2026-09-20
- **Run.** 2026-09-20-privacy-preview
- **Invariants touched.** I1, I2
- **Supersedes.** none
- **Superseded by.** none

## Context

The privacy preview screen has to state the smallest group the system will report on. A
customer asked whether the threshold can be lowered for small sites, where a cohort of 5
is rare and the data would otherwise be unusable.

## Options considered

| Option | Consequence | Verdict |
|---|---|---|
| Per-tenant configurable threshold | Unblocks small sites. Also means the product cannot state a single number to an employee, and the privacy preview becomes a per-tenant promise the employee cannot verify. | rejected |
| Fixed threshold of 5, no override | Small sites see less. The promise is the same everywhere and an employee can check it. | rejected |
| Fixed floor of 5, tenant may raise it | Small sites see no more than today. A tenant that wants to be more protective can be. | chosen |

## Decision

Fixed floor of 5. A tenant may raise the threshold, never lower it. The floor is a
constant in code, not a column.

## Consequences

- Bad: small sites will have cycles where nothing reports. The empty state has to say so
  plainly rather than look broken.
- Good: the privacy preview can state a number the employee can hold the system to.
- Bad: sales cannot offer a lower threshold as a concession, and that needs saying to them.
- Migration: none.

## What would make us revisit

A regulatory regime that requires a different floor, or evidence that sites below ~30
people cannot use the product at all, measured rather than anecdotal.
```
