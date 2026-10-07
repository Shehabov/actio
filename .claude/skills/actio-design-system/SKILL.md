---
name: actio-design-system
description: "The Actio platform design system, derived from the approved visual references in docs/design-reference. Use when designing or building any Actio surface: the app shell, navigation, metric tiles, cards, the queue, tables, status, empty states or the composer. Covers layout anatomy, density, the inversion rule, mobile-first translation, and which reference patterns are adopted, adapted or rejected."
---

# The Actio design system

Seven references in `docs/design-reference/` set the platform's shape; this skill turns them into rules. `BRAND.md` governs tokens, type, colour, motion and copy. This skill governs layout anatomy, component structure, density and states. Vendored skills contribute craft only and lose to both (`actio-brand-guard`). Read a `BRAND.md` section before citing it (R-02).

## References

Under `.claude/skills/actio-design-system/references/`. Read the file when its trigger fires, not before.

| File | Holds | Read when |
|---|---|---|
| `components/<name>.md` | The single spec of `pill-tab-group`, `collapsible-section-header`, `bare-sparkline`, `quote-led-row`, `command-palette`: all seven headings, then an Audit block | The surface uses the component. Specify all seven headings from it; the auditor proves it from its Audit block |
| `shell.md` | Sidebar, section labels, nav item, identity mark, top bar, canvas, account area | The surface has any shell region |
| `metric-tile.md` | The tile, the featured figure, the inverted tile | A tile or featured figure |
| `cards.md`, `queue.md`, `charts.md` | Issue, panel and alert cards; the queue row, lane, status, sort; chart series and bans | The surface has that element |
| `empty-state.md` | The empty state spec | Every surface, when specifying its states |
| `responsive.md` | Widths, ten rules, the 360px translation table, screenshot evidence | Stating a layout at a width, translating shell or table to 360px, built-UI evidence |
| `smoothness.md` | The five smoothness rules in full | Composing a surface; a tint-versus-hairline dispute |
| `ref-06-measured.md` | `ref-06` measured, the declared departures, what smoothness is not | Composing a screen's layout; a spec takes a departure |
| `reference-set.md` | The seven references, adopt/adapt/reject, the colour doctrine, the `ref-04` table | Borrowing from an image; a contested `ref-04` result |

## Structure, never colour

References define anatomy, density, hierarchy and interaction. They never define colour, size, weight or radius: Vega `#00BFC4` is the accent and `BRAND.md` is the only source of values. A reference image cited beside a value is a defect (R-07, BUG-0006). `ref-06` is primary; where it and `ref-02` disagree `ref-06` wins, except the queue, which is deliberately denser.

**The `ref-04` test.** `ref-04` is the counter-example: a matrix of tinted cells on a red-to-green ramp, a score per cohort, sentiment as the lead figure, a comment count with no owner, colour carrying a cell's whole meaning. Put the screen beside it. If a stranger cannot tell which product routes work to a named owner and which reports a mood, the screen has failed whatever its palette.

## The five signatures of `ref-06`

If a screen has these it reads as `ref-06`; with none it reads as every other product in the category.

1. **The sidebar has no ground of its own.** Same surface as the canvas, one hairline between.
2. **The icon follows the label.** Label inline-start, icon inline-end at the far edge.
3. **Size carries emphasis, weight does not.** 400 everywhere except section headings at 600 and figures at the mono face's own 500.
4. **Two large panels, never a row of small tiles.** Three is the ceiling; four or more is a finding.
5. **Air.** Metric tile padding 48, section gaps 48, a screen that ends well before the fold.

**Row heights are composed, not picked**: block padding from the scale, plus the line box, plus the same padding again. If the height you want is not reachable from a scale step, the padding is wrong, not the scale (R-04).

| Row | Derivation | Height |
|---|---|---|
| Queue row | 12 + 24 + 12 | 48, which is also `min-touch-target` |
| Palette row / input | 8 + 24 + 8 / 16 + 24 + 16 | 40 / 56 |
| Quote-led row | 24 + 24 + 24 | 72 minimum, growing with the quote |
| Nav item | 20 + 24 + 20 | 64 |

**Counting the twelve.** About twelve elements per screen, counted. One element is the top bar, a metric tile, a panel or card, a tab group, a nav group, a chart, an empty state, or a list of repeated rows however many it holds. Thirteen is a finding.

**The anti-generic check**, before any surface leaves the designer. Each yes is a finding.

- [ ] A row of four or more small metric tiles?
- [ ] A sidebar with its own background colour, or the icon before the label?
- [ ] Anything bold that is not a section heading?
- [ ] The largest figure under Display size, or a metric tile padded under 48 on desktop?
- [ ] More than about twelve elements, or content that fills the viewport with no air at the end?
- [ ] A border where a tint step could have done the job?
- [ ] An icon in the corner of a card? That is decoration.
- [ ] Could this screenshot be dropped into any other SaaS product unnoticed? This is the whole test.

## Surface and smoothness

Smoothness is consistency, not gloss. Full text: `references/smoothness.md`.

| Rule | |
|---|---|
| Surface | Light: Ink 50 page, white panel (the tint step), white plus `shadow-overlay` for an overlay (`BRAND.md` §1.1 v1.5, settled; no override record). Dark: Cosmos page, `#1A1A18` panel, overlay with a `#33332F` border. An Ink 150 hairline separates repeated records, marks a structural chrome edge, or divides inside one surface. It never lifts a panel. Surface, border and hover are three different values (R-06) |
| Type | One scale across its full range. The featured figure is Plex Mono 500 at Display 40/46, label and meta at Caption and Small, no mid-size between |
| Chrome | Delete before styling: border, legend, axis, gridline, container, an icon repeating its label, a count nobody asked for |
| Motion | One curve `cubic-bezier(.2, 0, .2, 1)`; 120ms micro, 200ms panel, 300ms ceiling; `transform` and `opacity` only; triggered by a reader action, nothing animates on load (a progress indicator reports work and is exempt); reduced motion honoured. Never a spring, overshoot, stagger, parallax, count-up, self-drawing chart or shimmer |
| Rhythm | 8 inside a component, 16 between components, 24 between groups, 48 between sections, repeating down the page. Scale 4, 8, 12, 16, 24, 32, 48, 64 and nothing else; 14, 18, 20 and 30 do not exist. Card padding 24 (16 mobile) |
| Radius | 8 control, 12 card, 999 tag, status pill, tab group and composer only, 4 on the 16px identity mark (a declared departure), 0 on a single-sided border |

## The inversion rule

One surface per view may invert to Cosmos `#0C0C0C` with Halo `#EFEFEF` text and Vega 200 `#6FE0E5` for the accent figure (`BRAND.md` §2 measures Cosmos on Vega 400 at 8.62:1; Vega 200 is also the dark-mode accent-text token). It carries the one thing the reader came for: the overdue count on a queue, the response rate on a cycle, the deadline on an issue. The inverted surface and the primary button are one accent budget: with an inverted surface the primary button is the only other emphatic element. Two inverted surfaces, or a third accent element, is a finding. The spec names the inverted surface and what it carries, or states that none is inverted.

## States

Every surface ships all eight, each with its own layout, focus order and string slots. A state described as "the default, greyed" is not a state. An uncovered state is a major finding. The empty state: `references/empty-state.md`.

| State | Rule |
|---|---|
| Empty | An invitation that names what will appear and what puts it there. Never an apology, never "nothing here yet" |
| Loading | A plain indeterminate bar in Vega, the final layout reserved. The seal is never a spinner. No shimmer |
| Partial | Some data, some pending, and the reader can tell which |
| Error | What happened, then the next step, the control beside the message where the action is possible |
| Dense | The realistic worst case: 40 issues, the longest locale, the longest names. Truncation is specified, never accidental |
| Protected | Row present so the count reconciles; no title, no detail, no assignee. `state-protected` reads as its own class, never as an error or as overdue |
| Below threshold | Degrades without leaking the cohort size to a manager, a site lead or an administrator, the readers this suppression guards against. Only the cohort's own members may see it. States the rule in plain terms with its threshold of 5 and never names the filter. The earlier wording named no reader and was a defect (BUG-0020, R-10) |
| Offline | Answers held on device, stated plainly, sent on reconnect; nothing typed is lost |

## Responsive

Every surface works at every width, in both orientations and at 200% zoom: verified at 320, 360, 768, 1024 and 1440, and between the breakpoints (`BRAND.md` §1.5: 480, 768, 1024, 1440; reading width 720, data width 1200).

1. **Design 360px first**; tablet and desktop are written as deltas, never the reverse. 320 works, it does not degrade. 768 is a real layout, not a stretched phone; at 1024 the sidebar is an icon rail; at 1440 and above content stops at the data width.
2. No horizontal scroll on the page body at any width; only a table, diagram or code block scrolls, inside its own container.
3. Targets at least 48 by 48 with at least 8 between them, at every width and inside tables.
4. Test between breakpoints (1023, 769). 200% zoom is a width. Landscape phone is a 360px-tall viewport.
5. Nothing is hidden to fit: move it, stack it or send it to a detail view. Deleting it at a breakpoint is data loss.
6. The longest locale at the narrowest width: Tagalog at 320, not English at 360. RTL at every width. No device sniffing.

| Desktop | At 360px |
|---|---|
| 264px sidebar | Bottom bar, five destinations, labels always shown, never icons alone |
| Two metric tiles | One column, the inverted tile first |
| Two-column card grid | One column, the primary card first |
| Table with 6 columns | Rows, not a horizontal scroll: the two columns that matter, the rest on the detail view |
| Top bar with 5 actions | Title and one primary; the rest move into the view |
| Search with a shortcut chip | Search icon only; there is no keyboard |

**Evidence.** A design spec states the layout at every width, and carries a frame board only where one helps. Built UI carries a Playwright screenshot at 320, 360, 768, 1024 and 1440 in both themes, English and Arabic and the longest locale, plus one at 200% and one in landscape (`npx playwright`, `npx playwright install chromium` once). The full rules and the evidence text are in `references/responsive.md`.

## Dark mode

Not an inversion of light. Cosmos is the page and surfaces separate by lightening, because a shadow is invisible on near-black; shadows are removed entirely. The featured surface is the `#1A1A18` card. Status becomes an 8px dot with its label in secondary text. Never pure white: Halo reduces halation on the OLED screens night shifts read.

Tokens, from `Actio-Brand-Guidelines-v1.pdf` (`BRAND.md` v1.5 has no dark section, so cite "the Dark mode list in `actio-design-system`", never a `BRAND.md` section): page `#0C0C0C`, card `#1A1A18`, rule `#232320`, row rule `#1C1C1A`, primary text `#EFEFEF`, secondary `#A8A8A4`, muted `#6E6E69`, accent `#00BFC4` unchanged, accent text `#6FE0E5`, border `#33332F` replacing Ink 150, chart grid `#242422`. Designer and auditor take dark values from this list and do not open the 230 KB PDF.

Open item for Shehab: land these tokens in `BRAND.md` and keep the PDF in step. Until then no agent invents a dark value.

## Right to left

Logical properties throughout (`inline-start`, `inline-end`, `margin-inline`), so a layout mirrors without a second stylesheet. The sidebar and the lane accent rule move to the inline-end. Numerals, charts, media controls, identifiers and phone numbers stay LTR and the seal never mirrors; only the lockup order does (`BRAND.md` §7.3). Arabic sets one to two points larger with line height up 15 to 20% (§7.2).

## Pre-flight, structure

The brand pre-flight (colour, type, copy, contrast) is in `actio-brand-guard` and runs first. Then, before a surface leaves the designer:

- [ ] 360px designed first; every width stated; the eight states each with their own layout
- [ ] Exactly one inverted surface or none, named, and exactly one primary action
- [ ] Panels and record lists named per element: tint step for the first, hairline for the second
- [ ] Featured figure at Display 40/46 Plex Mono; every gap 8, 16, 24 or 48; chrome deleted before styled
- [ ] One curve, nothing over 300ms, no layout property animated, nothing animating on load
- [ ] No card inside a card; lane and status as separate signals; no greeting and no personal name anywhere
- [ ] Every component of the five used has all seven headings (dimensions, type, states, keyboard, 360px, dark, RTL); its pre-flight line from its reference holds
- [ ] The anti-generic check and the `ref-04` test answered

Then hand the string slot list to `ux-writer` and the spec to `ux-auditor`, who checks this list too: a surface that fails here fails twice.
