# Run report: a worked example

Moved verbatim from `actio-orchestration/SKILL.md` on 2026-10-07. Read it when writing
`report.md` at closure; the required sections are in the core skill under "The run report".
The example predates v2: in a v2 report the gate column reads `pass`, `fail` or `n/a` with its
reason (qc-lead's go is its `quality` gate reading `pass`), and the utilisation line gives
blocking and advisory counts separately.

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
