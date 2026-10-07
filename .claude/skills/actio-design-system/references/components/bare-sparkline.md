# Bare sparkline

The single source for this component. Moved verbatim from `actio-design-system/SKILL.md` on
2026-10-07; the restatements that were in `actio-ux-audit` and `ux-auditor.md` now point here,
and where they had drifted this text won. Read it whenever a surface uses the component: the
designer specifies all seven headings from it, with the values for that surface, and the
auditor proves it with the Audit block at the end. Sections it names (Smoothness, the chart
rules, Dark mode, the inversion rule) are in the core skill or a reference its References
table names.

The chart form for a metric panel. No axes, no gridlines, no legend, no tooltip on a
figure the reader can already see.

**Dimensions**

| Part | Spec |
|---|---|
| Height | 64px. It is a shape, not a chart. |
| Width | Fills its panel. Minimum 120px: below that the shape carries no readable trend and the figure stands on its own. |
| Line | 1.5px, Vega 400. Ink 500 for a comparison series. |
| Fill | None |
| Points | None, except a 3px dot on the last value where the reader needs to locate "now" |

**Type**

Plex Mono 12px, tabular, Ink 500, for the first and last period labels at the two ends.
Nothing else on the element carries type. The sample size sits beside the figure above the
shape, never on the line.

**States**

| State | Treatment |
|---|---|
| Normal | Two or more periods resolved. The line renders. |
| One period | No line. The dot alone at the value's position with its single period label beneath. A line drawn between one point and nothing is a fabricated trend. |
| No data | No line, no dot, no labels. The 64px stays reserved so nothing shifts when data lands, and the figure above carries the empty state's words. |
| Loading | The 64px reserved and empty. No shimmer, no placeholder line, no animation. |
| Partial | The line renders to the last period that resolved and stops. The gap is never interpolated, and the last resolved period becomes the second label. |
| Below threshold | Not rendered at all. A shape drawn from a suppressed series can be read back to the cohort size. |

**Keyboard**

None. The sparkline is not focusable, takes no hover treatment and carries no tooltip.
The SVG is `aria-hidden`, and the trend is written out in the panel's own text, for example
`Down 3 points since March`. The shape is a second reading of a figure that is already
stated, so a reader who cannot see it has lost nothing.

Where the reader needs to read a value off the chart, it is not a sparkline any more and
becomes a panel chart under the chart rules below.

**At 360px**

The panel is full width, so the shape is too, and the height stays 64px. Below 120px of
available width the shape is dropped and the figure stands alone. The two period labels
always stay: they are the only thing that says which window the shape covers.

**Dark mode**

The line stays Vega 400 `#00BFC4`, which holds against the `#1A1A18` card. Period labels
take the secondary `#A8A8A4`. A comparison series moves from Ink 500 to the muted `#6E6E69`,
because Ink 500 disappears against a dark card. Neither pair appears in the `BRAND.md` §2
table, so both are measured and recorded in the surface's contrast evidence. No gridline
exists in either theme, so the `#242422` chart grid token does not apply here.

**RTL**

The shape does not mirror. Time runs inline-start to inline-end in LTR and stays running the
same way in RTL, with the first period label on the left and the last on the right, because
`BRAND.md` §7.3 exempts charts and numerals from mirroring. The panel around it mirrors; the
sparkline inside it does not.

## Audit

The component-specific proofs. The checks every component shares (all seven headings present,
dark mode by token, RTL stated) and the severities are in `actio-ux-audit` §7. On a spec, read
each row off the named heading; on built UI, use the method given.

| Failure | How you prove it |
|---|---|
| A sparkline carrying axes, gridlines, a legend or a tooltip, or one the reader is expected to read a value from | Read the chart markup or the spec's Dimensions and Keyboard headings. If the reader has to read a value off it, it stopped being a sparkline and is judged against the chart rules instead, which is itself the finding |
| A sparkline that is focusable, or a trend not written out in the panel's text | Spec: the Keyboard heading. Built UI: Tab past it and read the accessible tree |
| A sparkline rendered below threshold, or a line drawn for one period | Spec: the States table. A shape drawn from a suppressed series can be read back to the cohort size |
| Squeezed rather than dropped below 120px, or a period label dropped | Spec: the 360px heading. Built UI: capture at 360px beside the desktop capture; a 40px-wide sparkline is the finding |
| A mirrored shape under RTL | Spec: the RTL heading. Built UI: render under `dir="rtl"` |
| The comparison series or the period labels in dark mode not measured | The contrast harness output must hold both pairs, because neither is in the `BRAND.md` §2 table |

Pre-flight line: no axes, no gridlines, no legend, no tooltip. Not focusable, and the trend
written out in text beside it. Dropped below 120px rather than squeezed.
