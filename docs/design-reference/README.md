# Design references

Seven references approved by the Product Lead. They define **look, feel and overall SaaS
experience**: anatomy, density, hierarchy, interaction.

What they do not contribute is colour, gradient, motion or copy style. **They never define
colour.** Vega `#00BFC4` is the accent and [`BRAND.md`](../../BRAND.md) is the only source
for it. A design document that cites a reference image as the reason for a colour value is a
defect, recorded as BUG-0006 in [`BUGS.md`](../../BUGS.md).

Motion comes from the spec too, and the smoothness doctrine `ref-06` produces does not
change a value of it: one curve, `cubic-bezier(.2, 0, .2, 1)`, at 120ms micro, 200ms panel,
300ms ceiling, transform and opacity only, reader-triggered, nothing animating on load.

The rules derived from these files are in
[`actio-design-system`](../../.claude/skills/actio-design-system/SKILL.md), which carries
the full adopt, adapt and reject table.

---

| File | What it contributes | Weight |
|---|---|---|
| `ref-01-assistant-shell.png` | Sidebar grouping with small-caps section labels, search with a keyboard shortcut chip, centred empty state, suggestion cards | Supporting |
| `ref-02-ops-dashboard.png` | Metric tile row, the inversion rule, count badges on navigation, card taxonomy, right-aligned figures, alert rows | **Primary for anatomy** |
| `ref-03-minimal-canvas.png` | Icon rail, restraint at rest, how little a screen can carry and still feel finished | Supporting |
| `ref-04-category-dashboard.png` | A sentiment heatmap of tinted cells on a red to green ramp, a score per cohort presented as a thing to defend | **Counter-example** |
| `ref-05-command-palette.webp` | Dark surfaces separating by lightness rather than by border, a grouped command menu, colour used only as small identity dots | Supporting |
| `ref-06-insights-panel.webp` | Pill tab group, collapsible section headers with a count, borderless metric panels, bare sparklines, a quote-led list separated by hairlines alone | **Primary for feel** |
| `ref-07-home-and-mobile.jpg` | The same system at desktop and phone width, a suggestion rail, a pill composer | Supporting |

`ref-02` teaches the anatomy of an operations product. `ref-06` teaches how it should feel.
Where they disagree on surface treatment, `ref-06` wins.

---

## `ref-04` is here to be refused

It is a competitor's culture dashboard, kept in the set because recognising it is the
fastest way to know when an Actio screen has gone wrong.

| It does | Actio |
|---|---|
| A matrix of dimensions against cohorts, every cell a tinted pill on a red to green ramp | One accent and three chart values. A multi-hue ramp encodes nothing a reader can decode. |
| A score per cohort, presented for comparison | Never a heatmap and never a score to defend. That rule is `actio-design-system`'s own, not a quotation from `BRAND.md`, which does not name the pattern. It rests on §6's chart palette and §1.4, which reserves the state colours for routing lanes. |
| Leads with sentiment as a percentage | Actio measures first-90-day attrition, closure rate and median days to close. |
| Colour carries the whole meaning of a cell | Every status carries a written label. A reader with deuteranopia loses nothing. |

**The test.** Put an Actio screen beside `ref-04`. If a stranger could not tell which
product routes work to a named owner and which one reports a mood, the Actio screen has
failed, whatever its palette.

The one thing it gets right, and Actio keeps: the sidebar separates primary navigation from
account and settings with a hairline and a large gap, so destinations used hourly are never
mixed with ones used twice a year.

---

## Adding a reference

Give it a `ref-NN-<short-slug>` name, add a row above saying what it contributes and
whether it is primary, supporting or a counter-example, and update the reference table in
`actio-design-system`. A reference nobody has written a rule from is decoration, so state
what it changes or leave it out.
