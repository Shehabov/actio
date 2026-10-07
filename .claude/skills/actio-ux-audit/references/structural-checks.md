# Structural checks and how to prove them

Moved verbatim from `.claude/agents/ux-auditor.md` (Pass B) on 2026-10-07. Read it when you audit
a spec or a built screen for the design system's structure and smoothness. The rules are in
`actio-design-system`; this is the proof method for each. The component rows (pill tabs,
sparklines, quote-led rows, collapsible sections, palettes) are not here: each component's
reference under `actio-design-system/references/components/` ends with its own Audit block.
Where the original wording had drifted, this text carries the settled rule: the tint step is
settled in `BRAND.md` v1.5 §1.1, so no override record is needed or expected. No finding here
proposes a fix; the Rule column names the rule and stops.

The design system adds the following, and they are audited the same way. Every one of them is a
structural fact you can read off the markup, the spec or a single screenshot, so none of them is a
judgement call.

| Failure | Rule it breaks | How you prove it |
|---|---|---|
| More than one inverted surface in a view, or an inverted surface with a second accent element beside it | The inversion rule. One surface per view inverts to Cosmos, and the inverted tile and the primary button are the same accent budget | Count the inverted surfaces and the emphatic elements in one frame of the view. Two of either is a finding |
| A metric tile carrying a border or a shadow, or four or more tiles in a row | Metric tile. It is a panel one lightness step up from the page, never an outlined box, and `ref-06` puts two on a screen, not six | Read the markup or the layer list. A border or a shadow is a finding. So is a fourth tile in the row, which is the generic-dashboard pattern from `ref-02` |
| An alert drawn as a tinted callout box instead of a left accent rule 3px at radius 0 on the panel surface, with an Ink 150 hairline between stacked rows | Card taxonomy, and the rejected list. Tinted callouts are off-brand, and Ink 50 is the page itself rather than a ground for the row | Read the fill on the alert container. A tint is a finding even when the tint is Vega, and so is an Ink 50 ground |
| Lane and status merged into a single colour signal | The queue. Lane is who owns it, status is where it has reached, and one colour cannot carry both | Compare the two on one row. Sharing a hue is a finding, and so is a pill doing duty as the lane indicator |
| A card inside a card | Card taxonomy. Group inside a card with a hairline and space | Read the DOM or the layer tree, not the screenshot. Nesting is a finding even when the inner card has no border |
| A desktop layout that was clearly not derived from the 360px view: a table that only works wide, a column set that survives only as horizontal scroll, a top bar action with nowhere to go in the bottom bar | Mobile first. The 360px view is designed first and desktop inherits from it | Ask for the 360px artefact. If it does not exist, or the desktop view cannot be traced back to it, it is a finding, and you write it in these words: a layout that only works at 1440px on a desk has failed |
| A chart series beyond Vega 400, Ink 500 and Vega 200, or a sibling hue anywhere in a ramp | Charts. No fourth colour, and the ageing ramp in `ref-02` is exactly what not to do | Count the distinct series colours. Four is a finding. One sibling hue is a finding on its own |

All seven are majors at minimum. The mobile one is a blocker when the 360px view is unusable
rather than merely cramped, and the inversion one is a blocker when the competing accent is the
primary action, because then the view has no primary action.

The smoothness doctrine in `actio-design-system` adds the following. `ref-06` is the reference
for how the product should feel, and these are the ways a surface fails it. Each one is a
structural fact you read off the markup, the spec or one screenshot, so none of them is a
judgement call either.

| Failure | Rule it breaks | How you prove it |
|---|---|---|
| A panel lifted with a border where a tint step belongs, or a record list separated by a tint where a hairline belongs | Surfaces separate by lightness and space. A hairline separates repeated records, a tint step lifts a surface off the page, and swapping the two is what makes an interface look assembled | Read the ground and the border on the container. A tint between queue rows, table rows or any repeated-record list is a finding outright. A border on a panel is a finding, because the tint step is settled in `BRAND.md` v1.5 §1.1 and needs no override record |
| A mid-size type step inserted between the featured figure and its meta | One type scale used across its full range. The featured figure takes Plex Mono 500 at Display 40/46 and the label and meta stay at Caption and Small. The jump is the composition | Read the three sizes off the spec or the computed styles. Anything between Display and Small is a finding, and so is a featured figure set below Display to close the gap from the other end |
| Chrome that was styled rather than removed: a legend, an axis, a gridline, a container or an icon repeating its label | Chrome is removed before anything is styled | Name the element and the thing it duplicates. A legend on a panel whose series are already named, an axis on a shape, a gridline nobody reads a value against, a container around a single readout, an icon beside a label that says the same word |
| Anything animating on load | Motion is triggered by a reader action. Nothing animates on load | Load the view and touch nothing. Record what moves. A number counting up, a chart drawing itself, a panel fading or sliding in, a skeleton shimmer. On the low-cost Android baseline this reads as lag, not polish |
| A transition using a second curve, exceeding 300ms, or animating a layout property | One curve `cubic-bezier(.2, 0, .2, 1)`, 120ms micro, 200ms panel, 300ms ceiling, `transform` and `opacity` only | Grep the transition and animation declarations. A second curve is a finding on its own, and so is `height`, `width`, `top`, `left`, `margin` or `padding` inside a transition. Spring, overshoot, stagger and parallax are findings wherever they appear |
| A gap that is not 8, 16, 24 or 48 | Vertical rhythm regular enough to predict: 8 inside a component, 16 between components, 24 between groups, 48 between sections | Measure the vertical gaps down one column and list them. A gap varied to fill space is a finding even when the value is on the spacing scale, because the rhythm is the rule, not the token |

Two of the component rows are blockers rather than majors: a quote-led row carrying a name,
because that is the privacy promise rather than a style rule, and a surface that fails the `ref-04`
test, because the product has then become the thing it exists to refuse.

**The `ref-04` test, run once per run, and again for any view whose composition differs from the one tested.** In spec mode answer it by reading the spec against the `ref-04` table in `actio-design-system` (`references/reference-set.md`); build the paired frame below once, from a rendered frame where one exists, and record it `n/a` with the reason where the spec has none (R-18). Open
`docs/design-reference/ref-04-category-dashboard.png`, put the surface under audit beside it in
one frame, and ask whether a stranger could tell which product routes work to a named owner and
which one reports a mood. Build the frame as a local HTML page holding both images and capture
it with Playwright, then save the paired frame to the evidence directory with your answer. If
the answer is no, name what carried it: a matrix of dimensions against cohorts with tinted
cells, a score per cohort presented as a thing to defend, sentiment led as a percentage, a count
with no owner and no date, or colour carrying the whole meaning of a cell. The palette being
correct is not a defence, and neither is the screen being only one view of several.
