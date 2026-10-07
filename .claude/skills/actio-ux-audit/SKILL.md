---
name: actio-ux-audit
description: Audit an Actio interface against interaction design heuristics, accessibility, localisation and the brand bans. Use when reviewing a design spec, a built screen, or a shipped surface, and when filing or triaging UX findings.
---

# UX audit

The auditor finds and proves; the designer fixes. An author grading their own work is blind to what an audit exists to catch. **A finding without evidence is an opinion and is not filed.** The auditor never fixes and never proposes a fix.

## Modes

| Mode | When | Rule |
|---|---|---|
| Spec | The design gate on `ux-designer/spec.md`, the default plan | Audit what the spec states: tokens, values, states, focus order, RTL, slot budgets. A check that needs rendered UI is recorded `n/a`, reason "spec only, nothing rendered", never failed for being absent (R-18) |
| Built UI | Implemented markup, a preview, a shipped surface, or a frame board you can render | Everything applies. Read `references/built-ui-methods.md` |

A check that applies and was not performed fails the gate. One that cannot apply is `n/a` with its reason. Neither is silent.

## Finding format

One object per finding in the handoff `findings[]` (schema in `actio-agent-protocol`). No `findings.md`, and no `fix` field.

```json
{"id":"UXA-1","severity":"blocker","where":"spec.md, queue, 360px, status column",
 "rule":"BRAND.md §1.4: every status carries a written label",
 "what":"Below 380px the label drops to its dot to fit the date column; a team lead with deuteranopia, mid-shift, cannot tell overdue from in progress.",
 "evidence":"evidence/ux-auditor/queue-360-status.png","route":"ux-designer","loop":1,"status":"open"}
```

- `where`: file and line, or screen, state, breakpoint and element. `rule`: the rule quoted, so the owner can act without opening the file: a `BRAND.md` section, a design-system rule, or the heuristic by name. A smoothness finding quotes the specific rule (the one curve, the 300ms ceiling, the tint step), never the word.
- `what`, at most 240 characters: the defect, then the frontline condition it hurts (low-cost Android, one hand, mid-shift, second language, glare, shared handset). A generic user is not a condition.
- `evidence`: one plain path that exists. `route`: the owner who can fix it (`ux-designer`, `ux-writer`, `tech-architect`).

## Severity, the one ladder

| Severity | Means | Gate |
|---|---|---|
| blocker | Fails WCAG 2.2 AA; breaks a `BRAND.md` non-negotiable; makes a task impossible or unsafe on the frontline baseline; loses data; breaks the privacy promise | Fails |
| major | Task completable but materially harder; broken in one locale, theme, state or size; inconsistent with the design system | Fails |
| minor | Correct and accessible, imprecise against the system | Passes; fixed in the same pass if trivial, else recorded `accepted` |
| nit | Polish with no effect on the task | Never fails or delays anything |

Blocker and major fail the design gate. Only Shehab can accept one, through `decisions_for_shehab`: the auditor, designer and orchestrator waive neither. Apply the ladder literally: an auditor who files everything as a blocker gets ignored, and then the real blockers ship.

## References

| File | Holds | Read when |
|---|---|---|
| `actio-design-system/references/components/<name>.md` | The component's single spec, then its Audit block | The surface uses the component. Never audit it from memory |
| `references/structural-checks.md` | The proof for each structure and smoothness failure; the `ref-04` test | Every audit |
| `actio-design-system/references/{shell,metric-tile,cards,queue,charts}.md` | The rules those proofs audit against | The surface has that element |
| `references/heuristic-examples.md` | What each heuristic failure looks like in Actio | Filing a heuristic finding |
| `references/built-ui-methods.md` | Measured methods, evidence set, responsive pass | Built-UI mode |

## 1. Mechanical pass, and Actio's bans

Run first, with Grep and a node script; nothing here is judgement. A ban broken is a **blocker**: the rule is in the spec, not in taste.

```
banned hexes   #FF7E2E #5AE29C #E2E05A #E05A90 #A366FF; #215BEA outside the account switcher and parent wordmark
spacing        any value outside 4, 8, 12, 16, 24, 32, 48, 64 (14, 18, 20, 30 do not exist)
radius         a non-token radius; any radius on a single-sided border
motion         a curve or duration outside the BRAND.md §1.5 pair; a transition with no reduced-motion path
type           a non-token size or leading; weight 300 or 800; a number outside Plex Mono; a numeric column without tabular-nums
text opacity   rgba or opacity lightening text instead of a token
fonts          any request to a public CDN
direction      left and right physical properties where logical are required
```

- [ ] White on Vega 400 (2.27:1). Vega 400 as body text or a link on a light ground. A second accent or any Lumofy sibling hue, even in a chart. Opacity on text.
- [ ] A gradient, glow, neon edge, coloured shadow, frosted panel or mesh; a shadow in the flow; a sparkle, star or wand icon; the seal rotated, stretched, recoloured, filled, contained or redrawn.
- [ ] More than one primary action in a view. A card inside a card. A rounded single-sided border.
- [ ] Title Case, all caps outside Plex Mono 12px labels, an emoji, an exclamation mark in system copy, a congratulating toast, an apologising empty state.
- [ ] A number outside Plex Mono; a percentage without its sample size; a status by colour without a written label.
- [ ] A count-up, a self-drawing chart, shimmer; motion over 300ms, a second curve, a layout property animated.
- [ ] A pie above three slices, a dual axis, a truncated value axis, 3D (`BRAND.md` §6). The design system's chart rule also bars a pie, donut, ring, radial or gauge at any count: three slices or fewer is a major.

## 2. Interaction heuristics

Name the heuristic in the finding.

| # | Heuristic | Check in Actio |
|---|---|---|
| 1 | Visibility of system status | State, owner and due date legible without opening the item; a slow action acknowledged |
| 2 | Match to the real world | The domain's words: issue, owner, lane, deadline, evidence, closed. A generic CRUD noun is a finding |
| 3 | User control and undo | Reversible actions undoable from the toast; irreversible ones behind a modal stating the consequence |
| 4 | Consistency and standards | One pattern per job, the same everywhere |
| 5 | Error prevention | Stopped before the mistake: validation on blur, real examples, no destructive primary |
| 6 | Recognition over recall | Persistent labels, not placeholders; a filter shows what it does |
| 7 | Flexibility and efficiency | A long queue is quick by keyboard, place kept |
| 8 | Minimalist design | Nothing that does not help this reader do this task |
| 9 | Error recovery | What happened, the next step, the control beside it |
| 10 | Help and documentation | The mechanism shown, not reassurance: the privacy preview is the model |

## 3. Accessibility, WCAG 2.2 AA

- [ ] Contrast computed in a node script from the hex values (`BRAND.md`; dark pairs from the Dark mode list in `actio-design-system`), never estimated; both hex values, the ratio and the script saved. Body text 4.5:1; large text and components 3:1; focus rings, chart series, status marks and input borders 3:1 against their neighbours. The designer's `evidence/contrast-<surface>.mjs` may be re-run instead of a second script when it covers every pair and its inputs match.
- [ ] Focus visible on every interactive element, never removed or replaced by colour; reading order; all keyboard reachable. The spec writes a numbered focus order per state.
- [ ] Targets 48 by 48 with at least 8 between them, tables included. A persistent visible label above every input. Icons `aria-hidden` when decorative, `aria-label` when the only control. Colour is never the sole carrier of meaning.
- [ ] Nothing at 200% zoom clips, overlaps or scrolls horizontally. `prefers-reduced-motion` honoured on every transition.
- [ ] No timeout inside a survey, no auto-advance, nothing flashes. Language set per locale. A screen reader pass on the survey and queue (built UI).

## 4. Frontline reality

The baseline is a low-cost Android, one hand, mid-shift, second language, glare, a bad connection, possibly shared. A layout that only works at 1440px on a desk has failed, and you say so in those words.

- [ ] 360px designed first and desktop inherits. The zero to ten scale, the most-tapped control, sits in the thumb zone.
- [ ] No low-contrast distinction carries meaning. Nothing blocks on a request that could show known-yet-stale data. An answer survives offline and reconnect.
- [ ] Safe on a shared handset: nothing per account that should be per device, no previous reader's data left on screen.
- [ ] Nothing requires a corporate email, a desktop browser or an app install.

## 5. Localisation and RTL

- [ ] Logical properties throughout. Directional icons mirror; the seal, non-directional icons, numerals, charts, media controls, phone numbers and identifiers do not (`BRAND.md` §7.3). Arabic one to two points larger, line height up 15 to 20%, no letterspacing, no synthesised bold (§7.2).
- [ ] Layout holds at the longest locale (Bahasa Indonesia 15 to 20% longer than English, Tagalog further). In spec mode test length against the `ux-designer/string-slots.json` budgets plus 20%.
- [ ] No string concatenated with a count. A single-name user can finish every form.

## 6. State coverage

Every surface, all eight states in `actio-design-system` States, plus dark, 200% zoom and RTL. An uncovered cell is a **major** (the state will happen), and a state you cannot reach is itself a finding. Below threshold must name whom the suppression guards against: cohort size is never shown to a manager, a site lead or an administrator (R-10, BUG-0020).

## 7. The platform design system

Audit against `actio-design-system` and the reference for each element used. A break here is **major**; where §1 also lists it, it is a blocker, filed against the ban.

- Structure and smoothness: prove each failure with `references/structural-checks.md`. The panel versus record-list split is settled in `BRAND.md` v1.5 §1.1: a missing override record is never a finding, a hairline lifting a panel is. Queue rows are 48 (12 + 24 + 12), not 44 or 52.
- The five components, from each component's reference. (a) All seven headings present: dimensions, type, states, keyboard, 360px, dark mode, RTL. One absent, or answered "per the design system" instead of the value for this surface, is a major filed against the component. (b) Every row of its Audit block. (c) No keyboard path is a blocker where the component is the only path to the task. (d) Dark pairs outside the §2 table measured. A quote-led row carrying a name is a blocker.
- A 360px view exists as a designed artefact and desktop traces back to it.
- A spec citing a reference image beside a colour, size or radius is a finding on its own (R-07, BUG-0006). A surface failing the `ref-04` test is a blocker.

## Running an audit

1. Read the spec (or open the built surface) and your brief slice; the ADR and task brief only for a constraint you cannot tell is deliberate.
2. Mechanical pass (§1), structure (§7), heuristics (§2), accessibility, frontline and localisation (§3 to §5), states (§6). Finish the audit: one complete list per loop beats three partial ones.
3. Evidence under `.actio/runs/<run-id>/evidence/ux-auditor/`.
4. An open blocker or major means `design: fail`: `status: rejected`, `next: ux-designer`. Otherwise `status: passed`, `next: frontend-engineer`; the copy gate runs beside you.
5. A prior finding is resolved only after its failing check is re-run on the changed artefact. A later loop re-audits the failed checks and what the fix touched (`git diff <old-snapshot> <new-snapshot>`).
6. Three rounds is the limit: on the third loop on the same surface, escalate to Shehab with both positions.
