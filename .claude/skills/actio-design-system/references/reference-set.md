# The reference set

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it before borrowing
any pattern from an image in `docs/design-reference/`, before arguing with a rule in the core
skill, and when a `ref-04` test result is contested. The sections it names (Smoothness, the
inversion rule, the chart section, the departures table) are in the core skill or in the
reference its References table names. The images never define colour (R-07, BUG-0006).

## The seven references

| Reference | What it contributes |
|---|---|
| `ref-01-assistant-shell.png` | Sidebar grouping with small-caps section labels, search with a shortcut chip, centred empty state, suggestion cards |
| `ref-02-ops-dashboard.png` | The inversion rule, count badges on navigation, card taxonomy, right-aligned figures, alert rows. Its six-tile metric row is **not** adopted. |
| `ref-03-minimal-canvas.png` | Icon rail, restraint at rest, how little a screen can carry and still feel finished |
| `ref-04-category-dashboard.png` | **A counter-example.** The category convention Actio rejects: a sentiment heatmap of tinted cells on a red to green ramp, scores presented as a thing to defend. Read it to recognise what the product must not become. |
| `ref-05-command-palette.webp` | Dark surfaces separating by lightness rather than by border, a grouped command menu with muted section labels, colour used only as small identity dots |
| `ref-06-insights-panel.webp` | **The primary reference, for anatomy as well as feel.** An unfilled sidebar with the icon after the label, two large metric panels rather than a tile row, pill tab groups, collapsible section headers with a count, bare sparklines, a quote-led list separated by hairlines alone, and the restraint that holds a screen near twelve elements |
| `ref-07-home-and-mobile.jpg` | The same system at desktop and phone width, a suggestion rail, a pill composer |

## What is adopted, adapted and rejected

Read this table before arguing with any rule below it.

| Reference pattern | Verdict | In Actio |
|---|---|---|
| Left sidebar, grouped, small-caps section labels | **Adopt** | Plex Mono 12px, 0.02em tracking, Ink 500. Five destinations flat, no second tier. |
| Count badges on navigation items | **Adopt** | The queue's whole job is showing what is owed. Plex Mono, tabular. |
| Org switcher at the top of the sidebar | **Adopt** | Sirius `#215BEA` is permitted here and in the parent wordmark and nowhere else (`BRAND.md` §1.1). |
| Metric tile: label, figure, sub-label, delta | **Adapt** | The parts are adopted. The **row of six is rejected** in favour of `ref-06`'s two large panels. Figures in Plex Mono. Every percentage carries `n=`. |
| One inverted surface per view to feature a single thing | **Adopt** | See the inversion rule below. It replaces "accent everywhere". |
| Card on neutral ground, hairline border, moderate radius | **Adapt** | 12px cards, no shadow in flow. A card that lifts off the page takes the tint step, not an outline; the Ink 150 hairline stays between repeated records and as an internal divider. See Smoothness §1. Settled in `BRAND.md` v1.5 §1.1. |
| Right-aligned numeric columns | **Adopt** | Plex Mono, tabular figures, aligned on the decimal. |
| Status pills on list rows | **Adapt** | Light mode: pill with written label. Dark mode: 8px dot, label in secondary text. Never colour alone. |
| Top bar: title, subtitle with period, actions right | **Adopt** | Sentence case throughout. |
| Search with a keyboard shortcut chip | **Adopt** | Chip in Plex Mono 12px. |
| Centred empty state with a mark and one action | **Adapt** | The intent is adopted, the centring is not. An invitation, never an apology, never "nothing here yet". Specified as a component below, because "centred empty state" left loose reads as a large illustration with a heading, a paragraph and a button. |
| Suggestion cards under a composer | **Adapt** | Only where the reader genuinely has a choice of next action. Not decoration. |
| **Lime / chartreuse accent** | **Reject** | Vega `#00BFC4` is the only colour Actio owns. Lime sits beside Stellar `#E2E05A`, a Lumofy sibling accent, banned in Actio UI. |
| **Soft gradient glow on the canvas and promo card** | **Reject** | Gradients, mesh and aurora blurs are on the off-brand list. Flat fills only. |
| **Multi-hue colour ramp for ageing buckets** | **Reject** | A sibling hue never appears, including in charts. Use the Vega scale with neutrals. |
| **Tinted callout boxes for alerts** | **Reject** | A tinted container spends the accent budget (`BRAND.md` §6: ~70% neutral / 20% ink / 10% Vega) on a box. Use a left accent rule at radius 0 and a hairline. |
| **Three or more accent elements in one view** | **Reject** | One accent per view. Where two elements read as primary, neither is. |
| **Title Case on buttons and headings** | **Reject** | Sentence case everywhere. `New invoice`, not `New Invoice`. |
| **Sparkle icon on the composer** | **Reject** | No sparkle, star or wand. Actio does not advertise its AI. |
| **Avatars, profile photographs, initials discs and stacked avatar groups** | **Reject** | Anywhere, not just on the surfaces that name them. An owner is written as a name in Small. A site, cycle or lane is carried by the 16px identity mark. Never a face, never an initials disc, never a stack. |
| **A progress ring, donut, gauge or radial anything** | **Reject** | Including a ring drawn around a figure on a tile. See the chart section. |
| **Desktop-first density** | **Reject** | The 360px view is designed first and desktop inherits from it. |
| Rounded corners on every container | **Reject** | 8px controls, 12px cards, 999px pills, 4px on the 16px identity mark as a declared departure, 0 on single-sided borders (`BRAND.md` §1.5, §6). Nothing else. A modal takes the card radius. |
| Surfaces separating by lightness, no borders (`ref-05`, `ref-06`) | **Adopt** | See Smoothness §1. Hairlines stay for repeated records, structural edges and internal dividers. The panel tint step is settled in `BRAND.md` v1.5 §1.1. |
| Pill tab group with a raised active tab (`ref-06`) | **Adopt** | Raised surface tint, never a Vega fill. |
| Collapsible section header with a count (`ref-06`) | **Adopt** | Default open. Count only where the number is actionable. |
| Bare sparkline, two labels, no axes (`ref-06`) | **Adopt** | The chart form for a metric panel. |
| Quote-led list row, hairline separated (`ref-06`) | **Adopt** | The form for verbatim feedback. Never carries a name. |
| Grouped command palette with identity dots (`ref-05`) | **Adopt** | The only lifted surface in the product. |
| **Sentiment heatmap of tinted cells (`ref-04`)** | **Reject** | See the counter-example below. This is the category convention Actio exists to refuse. |
| **Greeting the reader by name (`ref-07`)** | **Reject** | Actio has no first person and does not greet. The queue opens with work. |
| **A score presented as a thing to defend (`ref-04`)** | **Reject** | Actio measures first-90-day attrition, closure rate and median days to close, never a sentiment score. |

## The counter-example: `ref-04`

`ref-04` is a competitor's culture dashboard. It is in the reference set deliberately,
because recognising it is the fastest way to know when an Actio screen has gone wrong.

What it does, and why Actio refuses each one:

| It does | Actio |
|---|---|
| A matrix of dimensions against cohorts, every cell a tinted pill on a red to green ramp | A multi-hue ramp encodes nothing a reader can decode, and it is a sibling-hue scale by another name. Actio has one accent and three chart values. |
| Presents a score per cohort: Female 67, Male 82, Leadership 65 | This invites a manager to compare cohorts and defend a number. Never a heatmap, never a score to defend: that rule is this system's, not a quotation from `BRAND.md`, which does not name the pattern. It rests on §6's chart palette (Vega 400 primary, Ink 500 comparison, Vega 200 secondary, never a sibling hue as a categorical scale) and §1.4, which reserves the state colours for routing lanes. |
| Leads with sentiment, measured as a percentage | Actio measures first-90-day attrition, closure rate and median days to close. A sentiment score is the thing the category already does badly. |
| A comment count as a pill on every tile | A count with no owner and no date is a number that cannot be acted on. |
| Cohort columns fine enough to identify someone | Any cohort view has to pass the reporting threshold before it renders at all. |
| Colour carries the whole meaning of a cell | Every status carries a written label. A reader with deuteranopia loses nothing. |

**Use it as a test.** Put an Actio screen beside `ref-04`. If a stranger could not tell
which product routes work to a named owner and which one reports a mood, the Actio screen
has failed, whatever its palette.

The one thing `ref-04` gets right and Actio should keep: the left sidebar splits primary
navigation from account and settings with a hairline and a large gap, so the destinations a
reader uses hourly are never mixed with the ones they use twice a year.

`ref-02` teaches the parts an operations product needs. `ref-06` teaches how they are
assembled and how the result should feel. **Where they disagree on anything, `ref-06` wins**,
with one stated exception: the issue queue is deliberately denser than `ref-06`, for the
reason given below. Read the measured comparison before laying anything out.

**Take the structure. Hold the surface to `BRAND.md`.** The references are commercial
products with their own palettes, and several of their decisions are on Actio's banned
list. What we adopt is anatomy, density, hierarchy and interaction. What we do not adopt
is colour, gradient, motion and copy style.

**The references are for look, feel and overall SaaS experience. They are never cited for
a colour value.** The Product Lead has confirmed this: what they contribute is anatomy,
density, hierarchy, interaction and the shape of a product like this one. What they
contribute to the palette is nothing.

Actio's accent is Vega `#00BFC4`, and `BRAND.md` is the only source for it. The lime in
`ref-02` and `ref-03` sits beside Stellar `#E2E05A`, a Lumofy sibling accent that is
banned in an Actio interface, so adopting it would break the suite as well as the brand.

Any sentence in a design document that names a reference image as the reason for a colour
is a defect. It is recorded in `BUGS.md` as BUG-0006 and the rule it produced binds
`ux-designer`, `ux-auditor` and `frontend-engineer`.
