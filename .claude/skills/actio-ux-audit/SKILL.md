---
name: actio-ux-audit
description: Audit an Actio interface against interaction design heuristics, accessibility, localisation and the brand bans. Use when reviewing a design spec, a built screen, or a shipped surface, and when filing or triaging UX findings.
---

# UX audit

The auditor finds and proves. The designer fixes. Keeping those two jobs in separate
agents is the point: a designer grading their own work is blind to exactly the failures an
auditor exists to catch.

**A finding without evidence is an opinion and must not be filed.**

---

## Finding format

```markdown
### F-07 · Queue row · Status carried by colour alone at 360px

| | |
|---|---|
| Surface | Queue, mobile, 360px |
| Rule | BRAND.md: every status carries a written label. Never colour alone. |
| Severity | Blocker |
| Evidence | `evidence/queue-360-status.png`, `evidence/deuteranopia-sim.png` |
| Owner | ux-designer |

**What.** Below 380px the status label is truncated to its dot and the written label is
dropped to fit the date column.

**Why it hurts this reader.** A team lead with deuteranopia scanning a queue between
shifts cannot tell overdue from in progress. Overdue is the only red in the product
precisely so it means something, and at this width it means nothing.

**Suggested fix.** Drop the date to a second line before dropping the label. The date is
right-aligned so a queue scans vertically, but a date the reader cannot act on is worth
less than a state they can.
```

The Rule row names where the rule lives. A brand finding cites `BRAND.md`. A finding
against the platform design system cites `actio-design-system`, and quotes the rule rather
than only naming the skill, so the designer can act on the row without opening the file.

A finding against the smoothness doctrine cites `actio-design-system` the same way and
quotes the specific rule it breaks, the one curve or the 300ms ceiling or the tint step,
never the word smoothness on its own. Smoothness is not something a designer can act on.
A named rule is.

### Severity

| Severity | Means | Gate effect |
|---|---|---|
| **Blocker** | Breaks a brand rule, an accessibility requirement, or makes a task impossible for a real reader on the target device | Design gate fails. No exceptions. |
| **Major** | Degrades the task materially, or fails in one locale, one theme, or one state | Design gate fails. Can be waived only by Shehab, recorded. |
| **Minor** | Inconsistency or friction that does not block the task | Logged. Does not fail the gate. Fixed in this run if cheap. |

Do not inflate. An auditor who files everything as a blocker gets ignored, and then the
real blockers ship.

---

## 1. Actio's own bans

These come from `BRAND.md`. Breaking one is a blocker by definition, because the rule
exists in the spec rather than in taste.

- [ ] White on Vega 400 anywhere. 2.27:1, measured, fails.
- [ ] Vega 400 as body text or as a link on a light ground.
- [ ] A second accent. Any Lumofy sibling hue, including in a chart.
- [ ] Sirius outside the account switcher and the parent wordmark.
- [ ] Opacity applied to text.
- [ ] A spacing value outside 4, 8, 12, 16, 24, 32, 48, 64.
- [ ] Rounded corners on an element bordered on one side only.
- [ ] A shadow on anything in the document flow.
- [ ] More than one primary action in a view.
- [ ] Title Case anywhere, including buttons.
- [ ] All caps outside Plex Mono labels at 12px.
- [ ] Weight 300 anywhere.
- [ ] A number not set in Plex Mono, or a numeric column without tabular figures.
- [ ] A percentage without its sample size.
- [ ] A status shown by colour without a written label.
- [ ] An emoji, anywhere.
- [ ] An exclamation mark in system copy.
- [ ] A number that counts up on load, a chart that draws itself, skeleton shimmer.
- [ ] Motion over 300ms, a second curve, or animation of a layout property.
- [ ] A gradient, glow, neon edge, coloured shadow, frosted panel or mesh.
- [ ] A pie chart above three slices, a dual axis, a truncated value axis, a 3D effect.
- [ ] A sparkle, star or wand icon. Actio does not advertise its AI.
- [ ] The seal rotated, stretched, recoloured, filled, contained, or redrawn.
- [ ] A card inside a card.
- [ ] A toast that congratulates. An empty state that apologises.

## 2. Interaction heuristics

Cite the heuristic by name when you file against it.

| # | Heuristic | What to check in Actio |
|---|---|---|
| 1 | Visibility of system status | Does the reader know what state an issue is in, who owns it, and when it is due, without opening it? Is a slow action acknowledged? |
| 2 | Match to the real world | Does the interface use the domain's words: issue, owner, lane, deadline, evidence, closed? Any generic CRUD noun is a finding. |
| 3 | User control and undo | Is every reversible action undoable from the toast? Is every irreversible one behind a modal that states the consequence? |
| 4 | Consistency and standards | Does the same thing look and behave the same on every surface? Two patterns for one job is a finding. |
| 5 | Error prevention | Can the reader be stopped before the mistake rather than told after? Validation on blur, real placeholder examples, no destructive action as primary. |
| 6 | Recognition over recall | Are labels persistent rather than placeholders? Can the reader see what a filter is currently doing? |
| 7 | Flexibility and efficiency | Can a heavy user move through a long queue quickly, by keyboard, without losing their place? |
| 8 | Minimalist design | Is anything on screen that does not help this reader do this task? Actio's restraint is a product claim, not a preference. |
| 9 | Error recovery | Does every error say what happened and the next step, with the control beside it where the action is possible from that screen? |
| 10 | Help and documentation | Is the mechanism shown rather than explained? The privacy preview is the model: values, not reassurance. |

## 3. Accessibility, WCAG 2.2 AA

Measured, never estimated. Record both hex values and the computed ratio as evidence.

- [ ] Body text 4.5:1. Large text and interface components 3:1.
- [ ] Focus rings, chart series, status indicators and input borders each 3:1 against what
      sits beside them.
- [ ] Focus visible on every interactive element. Never removed, never replaced by colour.
- [ ] Focus order follows reading order. Every element reachable by keyboard.
- [ ] Targets 48 by 48 minimum, including inside tables.
- [ ] Every input has a persistent visible label, above the field, not inside it.
- [ ] Icons `aria-hidden` when decorative, `aria-label` when the only control.
- [ ] Colour is never the sole carrier of meaning.
- [ ] Nothing at 200% zoom clips, overlaps or scrolls horizontally.
- [ ] `prefers-reduced-motion` honoured on every transition.
- [ ] No session or form timeout inside a survey. No auto-advance. Nothing loops or flashes.
- [ ] Document language attribute set per locale, inline language changes marked.
- [ ] Screen reader pass on the survey and the queue, not only on a component in isolation.

## 4. The frontline reality check

This is the section that catches what a desktop review never will. The reader is usually
on a low-cost Android handset, one-handed, mid-shift, in a second language, in a noisy or
bright room, on an intermittent connection, possibly on a shared device.

- [ ] Designed at 360px first. Does the desktop layout inherit from it, or was mobile an
      afterthought squeezed from the desktop?
- [ ] Reachable one-handed. Is the most-tapped control, the zero to ten scale, in the
      thumb zone?
- [ ] Legible in glare. Is anything relying on a low-contrast distinction?
- [ ] Works on a slow connection. Is anything blocking on a request that could be shown
      as known-yet-stale?
- [ ] Survives offline and reconnect without losing an answer.
- [ ] Safe on a shared handset. Does anything persist per account that should persist per
      device, or leave a previous reader's data on screen?
- [ ] Nothing requires a corporate email, a desktop browser, or an app install.

## 5. Localisation and RTL

- [ ] Built with logical properties. Does it mirror without a second stylesheet?
- [ ] The seal does not mirror. The lockup order does: the seal moves to the right.
- [ ] Directional icons mirror. Clock, search, calendar, lock, chart and user do not.
- [ ] Numerals, charts, media controls, phone numbers and identifiers do not mirror.
- [ ] Arabic set one to two points larger, line height increased 15 to 20%.
- [ ] No letterspacing on Arabic. No synthesised bold.
- [ ] Layout holds at the **longest** locale, not the English one. Bahasa Indonesia runs
      15 to 20% longer than English, Tagalog further, Arabic around 15% shorter.
- [ ] No string concatenated with a count.
- [ ] A single-name user can complete every form.

## 6. State coverage matrix

Every surface, every state. An uncovered cell is a Major finding, because the state will
happen and somebody will meet it.

| State | Covered | Evidence |
|---|---|---|
| Empty | | An invitation, never an apology, never "nothing here yet" |
| Loading | | Indeterminate bar in Vega. Never the seal as a spinner. No shimmer. |
| Partial | | Some data, some pending, and the reader can tell which |
| Error | | What happened, then the next step. No apology, no blame. |
| Dense | | The realistic worst case: 40 issues, longest locale, longest names |
| Protected | | Row present so the count reconciles. No title, no detail, no assignee. |
| Below threshold | | Degrades without leaking the cohort size to anyone but the reader |
| Offline | | Answers held on device, stated plainly, sent on reconnect |
| Dark | | Surfaces separate by lightening, never by shadow. Halo, never pure white. |
| 200% zoom | | No clipping, no overlap |
| RTL | | Mirrored from logical properties alone. Numerals, charts, identifiers and the seal stay unmirrored. |

## 7. The platform design system

These come from `actio-design-system`, which derives them from the seven approved references
in `docs/design-reference/`. A break here is Major. Where the same thing also appears in
section 1 it is a Blocker, and you file it against the ban.

The references define look, feel and overall SaaS experience: anatomy, density, hierarchy
and interaction. **They never define colour.** Vega is the accent and `BRAND.md` is the only
source for it, so a spec that cites a reference image as the reason for a colour value is a
finding on its own (BUG-0006).

**Shell**

- [ ] Sidebar 264px. Section labels in Plex Mono 12px uppercase, Ink 500, no second tier.
- [ ] Top bar 64px, actions inline-end, exactly one primary action in the view.
- [ ] Canvas at 1200px for data, 720px for reading. Neither width is invented per screen.

**Inversion**

- [ ] Exactly one inverted surface in the view, or none. Two is a finding on its own.
- [ ] Nothing competes with it. The inverted surface and the primary button share one
      accent budget, so no third emphatic element sits beside them.
- [ ] The inverted surface carries the one thing the reader came for, not whatever happened
      to look good inverted.

**Metric tiles**

- [ ] No border, no card chrome, no shadow. These are readings, separated by space alone.
- [ ] Label in Plex Mono uppercase, 12px, Ink 500.
- [ ] Figure in Plex Mono with tabular figures.
- [ ] Every percentage carries `n=` in the sub-label.
- [ ] Delta written as `+4pp`, never `+4%`, and carrying its arrow, so colour is never the
      only signal.

**Cards**

- [ ] 12px radius, no shadow anywhere in the document flow. A card lifts off the page with
      the tint step, white on the Ink 50 page, not with an outline. The Ink 150 hairline
      stays between repeated records and as an internal divider, such as the rule under a
      panel card's header. The `BRAND.md` amendment moving panel surfaces to a tint step is
      still open with Shehab, so a hairline on a panel is not a finding by itself where the
      spec's override table records the choice.
- [ ] 24px padding, 16px on mobile.
- [ ] No card inside a card. Group with a hairline and space instead.
- [ ] Every issue card carries its identifier in Plex Mono at the block-end inline-end
      corner. It is how support conversations locate an item.

**Alert rows**

- [ ] Left accent rule 3px at radius 0, the panel surface as the ground, Ink 150 hairline
      between rows where alerts stack. **Never Ink 50, which is the page itself.**
- [ ] Never a tinted fill. The tinted callout box is the reference pattern Actio rejects.

**Queue**

- [ ] Rows 44px, 52px on touch.
- [ ] Hairline between rows. No zebra striping.
- [ ] Lane and status read as separate signals and are never merged into one colour.
- [ ] Dates right aligned in Plex Mono, so a long queue scans vertically.
- [ ] Sorted overdue first, then in progress by deadline, then open, then closed. Never by
      severity: severity is a judgement, a deadline is a fact.

**Charts**

- [ ] Vega 400, Ink 500, Vega 200 and nothing else. No fourth colour, no sibling hue, no
      multi-hue ramp for ageing buckets.
- [ ] Sample size beside every percentage.

**Mobile**

- [ ] The 360px view exists as a designed artefact, not as a note saying it will collapse.
- [ ] The desktop layout derives from it, not the reverse. Section 4 asks this from the
      reader's side; here you ask it of the spec.

**Smoothness**

From the Smoothness section of `actio-design-system`, which reads `ref-06` as the primary
reference for feel. Work these in order and quote the rule you file against.

1. [ ] **Surface treatment.** Panels separate by a tint step and space. Repeated-record
       lists separate by an Ink 150 hairline. Neither does the other's job: a hairline
       lifting a panel off the page, or a tint standing in for a row rule, is the finding.
       The `BRAND.md` amendment moving panels to a tint step is still open, so a panel on
       either treatment is not a finding by itself where the spec's override table records
       the choice. Mixing the two inside one view is.
2. [ ] **Type.** The featured figure is Plex Mono 500 at Display size, 40/46, with its
       label and meta at Caption and Small. No mid-size sits between the figure and its
       meta to soften the jump. The jump is the composition.
3. [ ] **Chrome.** No border, legend, axis, gridline, container or label-repeating icon
       that could have been deleted before the element was styled.
4. [ ] **Motion.** One curve, `cubic-bezier(.2, 0, .2, 1)`. 120ms micro, 200ms panel,
       300ms ceiling. `transform` and `opacity` only. Reader-triggered only, nothing
       animates on load, `prefers-reduced-motion` honoured on every transition.
5. [ ] **Rhythm.** Every gap is 8, 16, 24 or 48, and the same value repeats down the page
       rather than being varied to fill space.
6. [ ] **Pill tabs.** The active tab takes the raised surface tint, never a Vega fill,
       because the accent budget belongs to the primary action. Roving tabindex: Tab enters
       the group once and lands on the active tab. Arrow keys move between tabs and the
       panel updates on focus, not on a second keypress, wrapping at both ends, with Home
       and End reaching the first and last. At 360px the group is full width with the tabs
       dividing it equally, and four tabs have become a select rather than a horizontally
       scrolling strip. Dark: `#1A1A18` active tint, Halo active label, `#A8A8A4` inactive.
       RTL: the group mirrors and the arrow keys follow the visual order.
7. [ ] **Collapsible sections.** Default open. A count beside the title only where the
       number is actionable. State persists per device, not per account. The header is a
       48px full-width `button` with `aria-expanded` and `aria-controls`, toggled by Enter
       and Space, and focus stays on it through the toggle. Closed removes the body from
       the document rather than hiding it, so nothing inside is still reachable by Tab. At
       360px the title truncates before the count does. Dark: Halo title, `#A8A8A4` count
       and chevron, still no rule and no ground. RTL: title inline-start, chevron
       inline-end, and the 180deg rotation does not mirror.
8. [ ] **Sparklines.** First and last period labels only, no axes, no gridlines, no
       legend, 64px tall, and nothing asks the reader to read a value off the line. Where
       a value has to be read, it is a panel chart and takes the chart rules above. Not
       focusable, `aria-hidden`, with the trend written out in the panel text beside it.
       One period renders a dot and no line. Below threshold it is not rendered at all. At
       360px it is dropped below 120px of width rather than squeezed, and the two period
       labels are never dropped. Dark: Vega 400 line held, `#A8A8A4` labels, a comparison
       series at `#6E6E69`, both pairs measured because neither is in the §2 table. RTL:
       the shape does not mirror, because §7.3 exempts charts.
9. [ ] **Quote-led rows.** Hairline separated. No card, no avatar, and never a name: free
       text comes back reworded with names removed, so the meta line carries site and
       cohort only. One list is either all interactive or all static, never mixed. An
       interactive row is one focusable element opened by Enter, with no second target
       inside it. At 360px the quote keeps Body 15/24 and the meta wraps rather than
       truncating. Dark: Halo quote, `#A8A8A4` meta, the separator moving from Ink 150 to
       the `#1C1C1A` row rule. RTL: Arabic quotation marks, Latin runs and the date and
       identifier isolated LTR, and the row grows past 80px rather than clipping.
10. [ ] **Command palette.** Raised two steps and the only lifted surface in the product.
        The lane reads as an 8px dot, never as a fill. Focus goes to the input and stays
        there, arrow keys move the selection through `aria-activedescendant`, exactly one
        row is selected whenever there are results, Escape returns focus to the trigger,
        and Tab cycles inside the palette only. Matches stay ordered by section rather than
        interleaved by score. At 360px it is a full-height sheet with no shadow and no
        shortcut column, triggered by the top bar search icon. Dark: `#232320` surface with
        the shadow dropped entirely, `#1A1A18` selected row. RTL: the palette mirrors, the
        dot and the shortcut swap ends, and the arrow keys are unaffected.
11. [ ] **Spec completeness.** Each of the five carries all seven headings: dimensions,
        type, states, keyboard behaviour or a line saying it is not interactive, 360px,
        dark mode and RTL. A heading left out is a Major on its own, filed against the
        component rather than against the screen, because the `frontend-engineer` will
        otherwise invent the answer in code where no auditor sees it.
12. [ ] **The `ref-04` test.** Placed beside `ref-04`, a stranger can tell which product
        routes work to a named owner and which one reports a mood. If they cannot, that is
        the finding, whatever the palette.

---

## Running an audit

1. Read the design spec or open the built surface. Read the task brief it claims to
   implement, and the relevant ADR.
2. Work the seven checklists in order. Colour and bans first, because they are objective
   and fast, and a blocker there ends the audit early.
3. Capture evidence as you go, into `.actio/runs/<run-id>/evidence/`. Screenshot at 360px,
   at 360px under 200% zoom, and at the widest breakpoint the surface claims to support.
   Compute every contrast ratio from the two hex values and record both values with the
   result, rather than reading the pair by eye.
4. Write findings into `.actio/runs/<run-id>/ux-auditor/findings.md`, numbered, ordered by
   severity.
5. Set the gate. Any open blocker or major means `design: fail`.
6. Hand off to `ux-designer` with `status: rejected` and the round number, or to
   `ux-writer` with `status: passed`.

**You do not fix.** Suggesting a fix is part of a good finding. Applying it is the
designer's job, and doing it for them destroys the independence that makes the audit worth
running.

**Three rounds is the limit.** On the third loop with the same designer on the same
surface, escalate to Shehab with the disagreement stated plainly, rather than filing a
fourth round.
