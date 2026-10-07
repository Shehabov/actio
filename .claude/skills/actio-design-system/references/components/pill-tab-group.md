# Pill tab group

The single source for this component. Moved verbatim from `actio-design-system/SKILL.md` on
2026-10-07; the restatements that were in `actio-ux-audit` and `ux-auditor.md` now point here,
and where they had drifted this text won. Read it whenever a surface uses the component: the
designer specifies all seven headings from it, with the values for that surface, and the
auditor proves it with the Audit block at the end. Sections it names (Smoothness, the chart
rules, Dark mode, the inversion rule) are in the core skill or a reference its References
table names.

For switching a panel between two to four views of the same object. Not for navigation,
which is the sidebar's job.

```
┌──────────┬──────────┬──────────┐
│ Settings │ Members  │ Insights │   ← active has the raised surface
└──────────┴──────────┴──────────┘
```

**Dimensions**

| Part | Spec |
|---|---|
| Group | No container, no border, no ground. The tabs sit directly on the page. |
| Tab | 40px tall, 48px on touch (`BRAND.md` §1.5 minimum target), 999px radius, 16px inline padding |
| Gap | 8 between tabs |
| Count in a tab | 8px after the label, where a count is carried at all |

**Type**

Plex Sans 15/24, **weight 400 in every state**. Neither the size nor the weight changes on
activation: a label that grows or thickens reflows the whole group, and 500 is the mono
face's weight, not the sans face's (signature 3). The raised surface tint and the move from
Ink 500 to Ink 900 carry the state on their own. A count inside a tab is Plex Mono 12px,
tabular.

**States**

| State | Treatment |
|---|---|
| Inactive | Transparent ground, Ink 500 label, weight 400 |
| Active | The raised surface tint, Ink 900 label, weight 400 unchanged. **Not a Vega fill.** The accent budget belongs to the primary action. |
| Hover, inactive | The label moves to Ink 900. No ground, no border. Pointer only, so it does not exist on touch. |
| Hover, active | No change. The active tab is already where the reader is. |
| Focus | The `focus-ring` token at `focus-offset`, on the tab's own 999px shape. The group has no overflow, so the ring is never clipped. |
| Pressed | No separate treatment. The 120ms move into the active state is the feedback. |
| Disabled | Ink 300 label, transparent ground, `aria-disabled`. Used only where the view genuinely cannot exist for this reader, such as an insights tab under the reporting threshold. Never used to stand in for a permission message. |

**Keyboard**

- `role="tablist"`, each tab `role="tab"` with `aria-selected`, each panel `role="tabpanel"`
  with `aria-labelledby`.
- Roving tabindex. Tab enters the group once, landing on the active tab. Tab again leaves
  the group entirely.
- Arrow keys move between tabs and the panel updates on focus, not on a second keypress.
  Selection wraps at both ends.
- Home moves to the first tab, End to the last.

**At 360px**

Two or three tabs fit. The group takes the full content width and the tabs divide it
equally, so the labels stay centred and the targets stay even. Tab height 48px, gap 8.

Four tabs do not fit with a readable label. Where a surface needs four, the group becomes a
full-width select at 48px with its label above it, or the fourth view moves to its own
screen. **Never a horizontally scrolling tab strip**: the tabs off screen are invisible, and
the strip competes with the page scroll under a thumb.

**Dark mode**

The raised surface tint is `#1A1A18` on the `#0C0C0C` page. Active label Halo `#EFEFEF`,
inactive label the secondary `#A8A8A4`, disabled the muted `#6E6E69`. Nothing gains a border
and nothing gains a shadow, because a shadow is invisible on a near-black ground.

**RTL**

The group mirrors: the first tab sits inline-start and therefore renders on the right. Built
with `padding-inline` and `margin-inline`, it mirrors with no second rule. Arrow keys follow
the visual order, so the left arrow moves to the next tab and the right arrow to the
previous. A count inside a tab stays LTR inside `dir="ltr"` with `unicode-bidi: isolate`.

**Settled in `BRAND.md` v1.5 §6.** `radius-pill` 999px is for tags, status pills, tab
groups and the composer, and for nothing else. Never a card, a panel, an input or a primary
button.

## Audit

The component-specific proofs. The checks every component shares (all seven headings present,
dark mode by token, RTL stated) and the severities are in `actio-ux-audit` §7. On a spec, read
each row off the named heading; on built UI, use the method given.

| Failure | How you prove it |
|---|---|
| The active tab takes a Vega fill rather than the raised surface tint | Read the fill on the active tab. A Vega fill is a finding, and where the view also has a primary button it is the inversion failure as well |
| No keyboard path: a group that needs Tab per tab, a panel that waits for a second keypress, no Home and End | Spec: the Keyboard heading names roving tabindex, arrows updating on focus, wrap, Home and End. Built UI: keyboard through the group and save the trace |
| A horizontally scrolling tab strip at 360px, or four tabs kept as tabs | Spec: the 360px heading. Built UI: capture at 360px beside the desktop capture |
| Arrow keys not following the visual order under RTL, or a count that lost its LTR isolation | Spec: the RTL heading. Built UI: render under `dir="rtl"` and key through it |

Pre-flight line: active on the raised tint, never a Vega fill. Roving tabindex, arrow keys
updating the panel on focus. No horizontally scrolling strip at 360px.
