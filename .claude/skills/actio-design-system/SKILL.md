---
name: actio-design-system
description: The Actio platform design system, derived from the approved visual references in docs/design-reference. Use when designing or building any Actio surface: the app shell, navigation, metric tiles, cards, the queue, tables, status, empty states or the composer. Covers layout anatomy, density, the inversion rule, mobile-first translation, and which reference patterns are adopted, adapted or rejected.
---

# The Actio design system

Seven references in [`docs/design-reference/`](../../../docs/design-reference/) set the
platform shape the Product Lead wants. This skill turns them into rules.

| Reference | What it contributes |
|---|---|
| `ref-01-assistant-shell.png` | Sidebar grouping with small-caps section labels, search with a shortcut chip, centred empty state, suggestion cards |
| `ref-02-ops-dashboard.png` | Metric tile row, the inversion rule, count badges on navigation, card taxonomy, right-aligned figures, alert rows |
| `ref-03-minimal-canvas.png` | Icon rail, restraint at rest, how little a screen can carry and still feel finished |
| `ref-04-category-dashboard.png` | **A counter-example.** The category convention Actio rejects: a sentiment heatmap of tinted cells on a red to green ramp, scores presented as a thing to defend. Read it to recognise what the product must not become. |
| `ref-05-command-palette.webp` | Dark surfaces separating by lightness rather than by border, a grouped command menu with muted section labels, colour used only as small identity dots |
| `ref-06-insights-panel.webp` | **The primary reference for how it should feel.** Pill tab group, collapsible section headers with a count, borderless metric panels, bare sparklines, a quote-led list separated by hairlines alone |
| `ref-07-home-and-mobile.jpg` | The same system at desktop and phone width, a suggestion rail, a pill composer |

Where `ref-02` teaches the **anatomy** of an operations product, `ref-06` teaches the
**feel**. Where they disagree on surface treatment, `ref-06` wins.

**Take the structure. Hold the surface to `BRAND.md`.** The references are commercial
products with their own palettes, and several of their decisions are on Actio's banned
list. What we adopt is anatomy, density, hierarchy and interaction. What we do not adopt
is colour, gradient, motion and copy style.

---

## What is adopted, adapted and rejected

Read this table before arguing with any rule below it.

| Reference pattern | Verdict | In Actio |
|---|---|---|
| Left sidebar, grouped, small-caps section labels | **Adopt** | Plex Mono 12px, 0.02em tracking, Ink 500. Five destinations flat, no second tier. |
| Count badges on navigation items | **Adopt** | The queue's whole job is showing what is owed. Plex Mono, tabular. |
| Org switcher at the top of the sidebar | **Adopt** | Sirius `#215BEA` is permitted here and in the parent wordmark and nowhere else (`BRAND.md` §1.1). |
| Metric tile row: label, figure, sub-label, delta | **Adopt** | Figures in Plex Mono. Every percentage carries `n=`. |
| One inverted surface per view to feature a single thing | **Adopt** | See the inversion rule below. It replaces "accent everywhere". |
| Card on neutral ground, hairline border, moderate radius | **Adapt** | 12px cards, no shadow in flow. A card that lifts off the page takes the tint step, not an outline; the Ink 150 hairline stays between repeated records and as an internal divider. See Smoothness §1. Settled in `BRAND.md` v1.5 §1.1. |
| Right-aligned numeric columns | **Adopt** | Plex Mono, tabular figures, aligned on the decimal. |
| Status pills on list rows | **Adapt** | Light mode: pill with written label. Dark mode: 8px dot, label in secondary text. Never colour alone. |
| Top bar: title, subtitle with period, actions right | **Adopt** | Sentence case throughout. |
| Search with a keyboard shortcut chip | **Adopt** | Chip in Plex Mono 12px. |
| Centred empty state with a mark and one action | **Adopt** | An invitation, never an apology. Never "nothing here yet". |
| Suggestion cards under a composer | **Adapt** | Only where the reader genuinely has a choice of next action. Not decoration. |
| **Lime / chartreuse accent** | **Reject** | Vega `#00BFC4` is the only colour Actio owns. Lime sits beside Stellar `#E2E05A`, a Lumofy sibling accent, banned in Actio UI. |
| **Soft gradient glow on the canvas and promo card** | **Reject** | Gradients, mesh and aurora blurs are on the off-brand list. Flat fills only. |
| **Multi-hue colour ramp for ageing buckets** | **Reject** | A sibling hue never appears, including in charts. Use the Vega scale with neutrals. |
| **Tinted callout boxes for alerts** | **Reject** | A tinted container spends the accent budget (`BRAND.md` §6: ~70% neutral / 20% ink / 10% Vega) on a box. Use a left accent rule at radius 0 and a hairline. |
| **Three or more accent elements in one view** | **Reject** | One accent per view. Where two elements read as primary, neither is. |
| **Title Case on buttons and headings** | **Reject** | Sentence case everywhere. `New invoice`, not `New Invoice`. |
| **Sparkle icon on the composer** | **Reject** | No sparkle, star or wand. Actio does not advertise its AI. |
| **Desktop-first density** | **Reject** | The 360px view is designed first and desktop inherits from it. |
| Rounded corners on every container | **Reject** | 8px controls, 12px cards, 999px pills, 0 on single-sided borders (`BRAND.md` §1.5, §6). Nothing else. A modal takes the card radius. |
| Surfaces separating by lightness, no borders (`ref-05`, `ref-06`) | **Adopt** | See Smoothness §1. Hairlines stay for repeated records, structural edges and internal dividers. The panel tint step is settled in `BRAND.md` v1.5 §1.1. |
| Pill tab group with a raised active tab (`ref-06`) | **Adopt** | Raised surface tint, never a Vega fill. |
| Collapsible section header with a count (`ref-06`) | **Adopt** | Default open. Count only where the number is actionable. |
| Bare sparkline, two labels, no axes (`ref-06`) | **Adopt** | The chart form for a metric panel. |
| Quote-led list row, hairline separated (`ref-06`) | **Adopt** | The form for verbatim feedback. Never carries a name. |
| Grouped command palette with identity dots (`ref-05`) | **Adopt** | The only lifted surface in the product. |
| **Sentiment heatmap of tinted cells (`ref-04`)** | **Reject** | See the counter-example below. This is the category convention Actio exists to refuse. |
| **Greeting the reader by name (`ref-07`)** | **Reject** | Actio has no first person and does not greet. The queue opens with work. |
| **A score presented as a thing to defend (`ref-04`)** | **Reject** | Actio measures first-90-day attrition, closure rate and median days to close, never a sentiment score. |

---

## The references do not define colour. Settled.

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

---

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

---

## Smoothness

The Product Lead asked for something smooth, in the register of `ref-06`. Smoothness there
is not gloss, and copying gloss is how a product gets the opposite of it. It comes from
five things Actio can adopt without breaking a single rule.

### 1. Surfaces separate by lightness and space, not by outline

The single biggest change. In `ref-05` and `ref-06` nothing has a visible border. A panel
is one step lighter than the page and that is the whole treatment.

| Surface | Light | Dark |
|---|---|---|
| Page | Ink 50 `#F6F6F4` | Cosmos `#0C0C0C` |
| Panel, raised one step | White `#FFFFFF` | `#1A1A18` |
| Panel, raised two steps (a menu, a popover) | White with the overlay shadow token | `#1A1A18` with a `#33332F` border |
| Inverted feature surface | Cosmos | `#1A1A18` with Vega 200 for the figure |

Every dark value in that table comes from `Actio-Brand-Guidelines-v1.pdf`, not from a
`BRAND.md` section. See Dark mode below.

**What the ban actually forbids** is a hairline drawn *around* a surface to lift it off the
page. The hairline keeps three jobs, and `BRAND.md`'s Ink 150 rule does not change in any
of them.

| Hairline still used for | Examples |
|---|---|
| Separating repeated records | Table rows, queue rows, quote-led rows, alert rows in a list |
| A structural edge in the chrome | The sidebar's inline-end edge, the split between primary navigation and the account group (`ref-04`'s one good idea) |
| A divider inside one surface | The rule beneath a panel card's header, a group boundary inside a card |

The hairline separates and divides. The tint step lifts. Using a hairline to do the lifting
is what makes an interface look assembled.

**Settled in `BRAND.md` v1.5 §1.1.** The light surface stack is Ink 50 `#F6F6F4` page,
white `#FFFFFF` panel, white plus `shadow-overlay` for an overlay. Halo `#EFEFEF` is not the
page: it is the dark-mode primary text and the ground the mark reverses onto. A hairline
separates repeated records; it does not lift a surface. This is no longer a deviation and no
override record is needed.

### 2. One type scale, used across its full range

`ref-06` sets `491` enormous against 13px meta and nothing in between. The contrast is the
composition. Actio's scale already reaches Display 40/46, so nothing new is needed: the
featured figure takes **Plex Mono 500 at Display size**, and its label and meta stay at
Caption and Small. Do not reach for a mid-size to soften the jump. The jump is the point.

### 3. Chrome is removed before it is styled

A bare sparkline with two date labels reads as calmer than a styled chart, because there is
less to read. Before styling any element, delete: the border, the legend, the axis, the
gridline, the container, the icon that repeats the label, and the count nobody asked for.
Style what survives.

### 4. Motion is consistent, not elaborate

Smooth motion in this product is one curve, short, and only in response to something the
reader did.

| Rule | |
|---|---|
| Curve | `cubic-bezier(.2, 0, .2, 1)`, everywhere, no exceptions |
| Duration | 120ms micro, 200ms panel, 300ms ceiling |
| Properties | `transform` and `opacity` only |
| Trigger | A reader action. **No content animates itself in on load.** The one exception is a progress indicator, which reports work rather than decorating an entrance: see the loading state. |
| Reduced motion | Honoured on every transition |
| Never | Spring, overshoot, stagger, parallax, a number counting up, a chart drawing itself, skeleton shimmer |

A view that animates when it arrives feels slower than one that does not, on the handset
this product runs on. Smoothness is the absence of jank, not the presence of movement.

### 5. Vertical rhythm is regular enough to predict

`ref-06` is restful because every gap is one of a handful of values and they repeat down
the page. Use 8 inside a component, 16 between components, 24 between groups, 48 between
sections, and do not vary them to fill space. An irregular gap reads as an error even when
the reader cannot say why.

### What smoothness is not

| Not | Because |
|---|---|
| A gradient, a glow, a frosted panel | On the off-brand list, and they read as decoration on an instrument |
| A longer transition | Over 300ms reads as lag, not polish |
| A spring or an overshoot | One curve. A bouncing panel is a toy. |
| A greeting by name | `ref-07` opens with "Hello, Sofie". Actio has no first person and does not greet. The queue opens with work. |
| A larger radius | 8 controls, 12 cards, 999 pills, 0 on a single-sided border, and nothing else |
| More whitespace everywhere | Rhythm, not emptiness. A dense queue is correct when the reader came to scan forty items. |

---

## App shell anatomy

```
┌──────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR     │  TOP BAR                                             │
│  264px       │  title · subtitle · search · actions · one primary   │
│              ├──────────────────────────────────────────────────────┤
│  org switch  │  CANVAS                                              │
│  ─────────   │  max 1200px for data, 720px for reading              │
│  primary CTA │  64px side margin desktop, 16px mobile               │
│              │                                                      │
│  QUEUE       │  ┌─ metric row ─────────────────────────────────┐    │
│  · Queue  12 │  │ one inverted tile, the rest neutral          │    │
│  · Cycles    │  └──────────────────────────────────────────────┘    │
│  · People    │                                                      │
│  CLOSURE     │  ┌─ primary card ────────┐ ┌─ secondary card ──┐    │
│  · Evidence  │  │                       │ │                   │    │
│  · Settings  │  └───────────────────────┘ └───────────────────┘    │
│              │                                                      │
│  ─────────   │                                                      │
│  Lumofy ▾    │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

| Region | Rules |
|---|---|
| Sidebar | 264px fixed. Ground Ink 50, hairline Ink 150 on the inline-end edge. Collapses to an icon rail at 1024px, to a bottom bar at 768px. |
| Section labels | Plex Mono 12px 400, 0.02em tracking, Ink 500, uppercase. All-caps is permitted only in a Plex Mono 12px label at 0.02em (`BRAND.md` §3), here and on the metric tile. |
| Nav item | 40px tall, 8px radius, 8px gap icon to label, Plex Sans 15/24. Active is a Vega 50 fill with Vega 800 text, never a Vega 400 fill with white. |
| Count badge | Plex Mono 12px tabular, inline-end aligned. Overdue counts take the overdue status colour; everything else is Ink 500. |
| Top bar | 64px. Title H2, subtitle Small in Ink 500 on one line beneath. Actions inline-end. **Exactly one primary.** |
| Canvas | Ink 50 ground. Data width 1200px, reading width 720px. Margins 64 / 32 / 16 by breakpoint. |
| Account area | Sidebar foot. Lumofy wordmark and product switcher. Sirius is permitted in the parent wordmark and the account switcher and nowhere else in the interface (§1.1). |

---

## The inversion rule

This is the single most useful thing the references teach, and it replaces the instinct to
spread the accent around.

**One surface per view may be inverted to Cosmos. It carries the one thing the reader came
for.** Everything else stays neutral. On a queue that is the overdue count. On a cycle it
is the response rate. On an issue it is the deadline.

| | |
|---|---|
| Inverted surface | Cosmos `#0C0C0C` ground, Halo `#EFEFEF` primary text, Vega 200 `#6FE0E5` for the accent figure |
| Why Vega 200 and not Vega 400 | `BRAND.md` §2 measures the Cosmos / Vega 400 pair at 8.62:1, so Vega 400 clears AA against a Cosmos ground; Vega 200 reads brighter at small sizes and matches the dark-mode accent-text token, so one token serves both |
| Never | Two inverted surfaces in one view. A third accent element beside the inverted tile. |

The inverted tile and the primary button are **the same accent budget**. If the tile is
inverted, the primary button is the only other emphatic element, and nothing else competes.

---

## Metric tile

The workhorse of `ref-02`, and the component Actio needs most.

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ RESPONDED            [icon] │        │ DAYS OVERDUE         [icon] │  ← inverted
│                             │        │                             │
│ 41%                         │        │ 12                          │
│ n=612                       │        │ Warehouse B                 │
│ ↗ +4pp                      │        │ ↘ -3 since March            │
└─────────────────────────────┘        └─────────────────────────────┘
```

| Part | Spec |
|---|---|
| Label | Plex Mono 12px 400, 0.02em, Ink 500, uppercase |
| Icon | 16px, 1.5px stroke, Ink 300, block-start inline-end. Decorative, `aria-hidden`. |
| Figure | Plex Mono 500, tabular. Display 40/46 on the inverted tile, because that is the featured figure of the view (Smoothness §2). The metric token 28/32 on the neutral tiles. Ink 900, or Vega 200 on the inverted tile. |
| Sub-label | Plex Sans 400 13/20, Ink 500. **A percentage always carries `n=` here.** |
| Delta | Plex Mono 12px with an arrow glyph. Written as `+4pp` or `-4pp`, never `+4%`. |
| Delta colour | Improvement uses the closed status colour, deterioration uses overdue. Both carry the arrow, so colour is never the sole carrier. |
| Chrome | **No border, no card, no shadow.** These are readings, not objects. Separated by space alone. |
| Row | 4 to 6 tiles desktop, 2 up tablet, 1 up mobile with the inverted one first. |

---

## Card taxonomy

An issue is an object and takes a card. A queue is a list and takes rows. Forty issues
rendered as cards cannot be scanned.

| Card | Use | Anatomy |
|---|---|---|
| **Issue card** | One issue, in detail | Title H3, status pill inline-end, meta line in Small, body, actions block-end, identifier in Plex Mono at the block-end inline-end corner |
| **Panel card** | A chart, a list, a grouped readout | Header row: title H3 inline-start, one action inline-end as a text button with a chevron. Hairline beneath the header. Body padded 24. |
| **Alert row** | Something needs attention | **Left accent rule 3px at radius 0**, the panel surface as its ground, Ink 150 hairline between rows where alerts stack. Never a tinted fill, and never Ink 50, which is the page itself. Icon, message, then one text action. |
| **Metric tile** | A reading | No chrome. See above. |

Rules that hold for all of them:

- 12px radius, no shadow. Only overlays lift.
- Surface by the Smoothness §1 split: a card lifts off the page with the tint step, white on
  the Ink 50 page, not with an outline. Ink 150 hairlines stay between repeated records and
  as an internal divider, such as the rule under a panel card's header. Settled in `BRAND.md`
  v1.5 §1.1: a panel lifts by a tint step, never by an outline.
- 24px padding. 16px on mobile.
- **A card never contains another card.** Group inside a card with a hairline and space.
- Every issue card carries its identifier, Plex Mono, block-end inline-end. It is how
  support conversations locate an item.

---

## Components from `ref-05` and `ref-06`

Each of the five is specified to the same seven headings: dimensions, type, states,
keyboard behaviour where it is interactive, behaviour at 360px, dark mode and RTL. A
component missing any of the seven is not buildable, and the `frontend-engineer` rejects
a spec that leaves one for them to guess.

Two rules hold across all five. Colours come from `BRAND.md` and the dark values from
`Actio-Brand-Guidelines-v1.pdf`, never from a reference image (BUG-0006). Every pair a
component introduces that is not already in the `BRAND.md` §2 table is measured and
recorded before the surface leaves the designer.

### Pill tab group

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

Plex Sans 15/24, weight 400 inactive and weight 500 active. The size never changes between
states, because a label that grows on activation reflows the whole group. A count inside a
tab is Plex Mono 12px, tabular.

**States**

| State | Treatment |
|---|---|
| Inactive | Transparent ground, Ink 500 label, weight 400 |
| Active | The raised surface tint, Ink 900 label, weight 500. **Not a Vega fill.** The accent budget belongs to the primary action. |
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

### Collapsible section header

For a long page that the reader works down. `ref-06` uses it for Statistics and Feedback.

**Dimensions**

| Part | Spec |
|---|---|
| Header row | 48px tall, the full content width, so the whole row is the target on touch as well as under a pointer |
| Inline padding | 0, so the title aligns with the content beneath it. The hover and focus shape takes an 8px radius and 8px of inline padding, bleeding outward. |
| Count | 8px after the title |
| Chevron | 16px, 1.5px stroke, inline-end. **Not 20px.** Icons sit on the 24px grid at 16 or 24 (`BRAND.md` §6, BUG-0005). |
| Gap to the body | 16 when open |
| Gap to the next header | 24 when closed |
| Rule | None. The header sits on space. |

**Type**

Title H3. Count Plex Mono 12px, tabular, and only when the number is actionable: an overdue
count qualifies, a total does not. Chevron Ink 500 in light mode.

**States**

| State | Treatment |
|---|---|
| Open | Chevron points block-start. The body renders beneath. This is the default on first load. |
| Closed | Chevron points block-end. The body is **removed from the document**, not hidden with opacity, so its focusable elements leave the tab order with it. |
| Toggling | The chevron rotates 180deg over `motion-micro`, 120ms on the standard curve. Nothing else moves. |
| Hover | The chevron moves from Ink 500 to Ink 900. No ground, no rule. Pointer only. |
| Focus | The `focus-ring` token at `focus-offset` on the header row's 8px shape. |
| Empty section | Renders open with the section's empty state inside it. A section that cannot be opened tells the reader nothing about what is in it. |
| Persistence | Per device, not per account. A worker may use a shared handset. |

There is no disabled state. A section is either present with content, present with an empty
state, or not rendered.

**Keyboard**

- The header is a `button` carrying `aria-expanded` and `aria-controls` pointing at the body.
- Enter and Space toggle it. Nothing else binds.
- Focus stays on the header through the toggle, so a reader collapsing three sections in a
  row never loses their place.
- When closed, nothing inside the body is reachable by Tab, because the body is removed
  rather than hidden.

**At 360px**

Unchanged in structure. The row is already full width at 48px, which is the touch target.
Where the title and count together exceed the width, **the title truncates at the end and
the count keeps its space**, because the count is the actionable half. The default stays
open: a collapsed section at 360px hides more work than it does on a desk, not less.

**Dark mode**

Title Halo `#EFEFEF`. Count and chevron the secondary `#A8A8A4`, with hover moving the
chevron to Halo. No rule and no ground appear, in either theme.

**RTL**

The title moves to the inline-start and renders on the right. The chevron moves to the
inline-end and renders on the left. The 180deg rotation runs in the block axis and does not
mirror. The count follows the title and stays LTR inside `dir="ltr"` with
`unicode-bidi: isolate`.

### Bare sparkline

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

### Quote-led row

The form for showing verbatim employee feedback, and the strongest pattern in `ref-06`.

```
"Rosters are published under 48 hours before the shift."
Warehouse B · 3 teams · 14 Mar
─────────────────────────────────────────────────────
"No path past senior agent."
Contact centre · 14 Mar
```

**Dimensions**

| Part | Spec |
|---|---|
| Padding | 16 block, 0 inline. The quote starts at the container edge. |
| Quote to meta | 4 |
| Row height | 80px for a one-line quote, growing with the quote. Already clears the 48px target where the row is interactive. |
| Separator | Ink 150 hairline between rows, never above the first or below the last. No card, no avatar, no icon. |

**Type**

| Part | Spec |
|---|---|
| Quote | Body 15/24, Ink 900, in quotation marks. The verbatim line is the primary element. Maximum four lines, then truncated at the end, never mid-word, with the full text on the detail view. |
| Meta | Small 13/20, Ink 500. Site, cohort, date, separated by a middle dot. |
| Identifier | Plex Mono 12px at the inline-end of the meta line, on interactive rows only. |
| Attribution | **Never a name.** Free text is returned reworded with names removed, so the meta line carries site and cohort, never a person. |

**States**

| State | Treatment |
|---|---|
| Static | Quote and meta, no affordance. Nothing about the row suggests it opens. |
| Interactive | The whole row is one target and carries its issue identifier. **One list picks one and holds it for every row**, so a reader never has to test which rows open. |
| Hover, interactive only | The raised surface tint across the row at 8px radius. The hairline is unchanged. Pointer only. |
| Focus, interactive only | The `focus-ring` token at `focus-offset` on the row's 8px shape. |
| Long quote | Four lines, then an ellipsis at the end. The meta line is never dropped to make room. |
| Empty | No rows. The panel renders an invitation naming the next check-in date, never "no feedback yet". |
| Loading | Three rows of reserved 80px height with their hairlines in place and nothing inside them. No shimmer. |
| Below threshold | The list is not rendered. The panel states the suppression rule and its threshold, and never the number of rows withheld. |

**Keyboard**

An interactive row is a single focusable element, reached by Tab in reading order, opened by
Enter. There is no second control inside a row: a second target inside a row is what makes a
list impossible to operate one-handed. Static rows are not focusable and carry no role.

**At 360px**

Structure unchanged. The quote keeps Body 15/24, because it is the one line the reader came
to read and it is never shrunk to fit. The meta line **wraps to a second line rather than
truncating**, and its middle dots wrap with it. Inline padding stays 0, so the quote starts
at the 16px page margin and nothing indents it further.

**Dark mode**

Quote Halo `#EFEFEF`, meta the secondary `#A8A8A4`. The separator moves from Ink 150 to the
row rule `#1C1C1A`. Hover takes `#232320`. No shadow in either theme.

**RTL**

The quote sets right to left and takes Arabic quotation marks. Latin runs inside it, a site
name or a system word, stay LTR inside `dir="ltr"` with `unicode-bidi: isolate`. The meta
line mirrors and its middle dots mirror with it; the date stays LTR. The identifier moves to
the inline-end and renders on the left, still LTR. Arabic sets one to two points larger with
line height increased 15 to 20%, so a one-line row grows past 80px. Nothing is clipped to
hold the height.

### Command palette

From `ref-05`. For an operator moving between sites, cycles and issues quickly.

**Dimensions**

| Part | Spec |
|---|---|
| Surface | Raised two steps, 12px radius, the overlay shadow token. The only lifted surface in the product. |
| Size | 560px wide, centred, 96px from the block-start of the viewport. Maximum height 480px, after which the list scrolls inside while the input stays fixed. |
| Input | 56px tall, no border, no ground of its own |
| Section label | 16 above the label, 8 below it |
| Row | 40px, 48px on touch, 8px radius |
| Identity dot | 8px, at the inline-start of the row |
| Padding | 8 inside the surface, so a row's hover shape clears the surface radius |

**Type**

| Part | Spec |
|---|---|
| Input | Plex Sans 15/24. The placeholder names an example, `Warehouse B, March cycle, INV-2841`, never an instruction. |
| Section label | Plex Mono 12px, 0.02em, Ink 500, uppercase: recent, sites, cycles, issues |
| Row label | Plex Sans 15/24, Ink 900, one line, truncated at the end |
| Row context | Small 13/20, Ink 500, one line, truncated at the end |
| Shortcut | Plex Mono 12px, inline-end |

**States**

| State | Treatment |
|---|---|
| Closed | Nothing rendered. No element persists in the document waiting to be shown. |
| Open, empty query | Recent first, at most five, then sites, cycles and issues under their labels with the three most recent each. |
| Typing | Results replace the sections. Matches stay ordered by section, sites then cycles then issues, **never interleaved by relevance score**, so the reader learns where to look rather than re-reading the list each time. |
| Selected row | The ground steps one back toward the page: Ink 50 in light mode, `#1A1A18` in dark. Never a Vega fill, which would spend the accent budget on a menu row. |
| Hover | The same treatment as selected, and hovering moves the selection, so there is only ever one highlighted row. |
| No results | One row in the product's own words naming what was searched and what the search covers: `No match for "warehous". Search covers sites, cycles and issues.` No illustration, no apology. |
| Loading | The palette opens immediately with recent, which is held on device. A pending remote section renders its label above one reserved 40px row. No shimmer. |
| Offline | Recent and anything held on device still resolve. The remote sections say in one line that they need a connection, and the palette stays usable for what is local. |

**Keyboard**

- `role="dialog"` with `aria-modal`. The input is `role="combobox"` with `aria-expanded` and
  `aria-controls`, the list is `role="listbox"`, each row is `role="option"`.
- The platform shortcut opens it. Escape closes it and returns focus to the element that
  opened it.
- Focus goes to the input on open and stays there. Arrow up and down move the selection
  through the rows without moving focus, tracked with `aria-activedescendant`, so typing
  keeps filtering.
- There is always exactly one selected row while there are results, the first by default, so
  Enter is never a no-op. Enter opens the selected row.
- Home and End move to the first and last row. Section labels are skipped, because they are
  not targets.
- Tab and Shift+Tab cycle inside the palette and nothing behind it is reachable while it is
  open.

**At 360px**

The palette is a full-width, full-height sheet rather than a floating panel, with radius 0
at the block-start edge and **no shadow**, because at that size it is the whole screen and
there is nothing left to lift it above. The input stays 56px above the software keyboard and
the list takes what is left. Rows go to 48px. The shortcut column is dropped: there is no
keyboard, so a shortcut chip repeats nothing. The trigger is the search icon in the top bar,
since the platform shortcut does not exist here.

**Dark mode**

The surface is `#1A1A18` with a `#33332F` border on the `#0C0C0C` page. Shadows are removed
in dark mode, so the border is what gives the popover its edge. It cannot be `#232320`,
because that is the rule colour, and a surface at the same lightness as its own border has
no edge at all. Row label Halo `#EFEFEF`, row context the secondary `#A8A8A4`,
section labels the muted `#6E6E69`, selected row `#232320`, which is the hover step above
the popover surface rather than the same value as it. The identity dot keeps its lane
colour in both themes, because it is an 8px identity mark rather than a status signal, and
the written label beside it carries the meaning.

**RTL**

The palette mirrors as a whole. The identity dot moves to the inline-start and renders on
the right; the shortcut chip moves to the inline-end and renders on the left. Arrow up and
down are unaffected, because the list runs in the block axis, which does not mirror. The
search icon does not mirror. Identifiers in a row, `INV-2841`, stay LTR inside `dir="ltr"`
with `unicode-bidi: isolate`.

---

## The queue

The default view, and the screen the product lives or dies on.

| Concern | Rule |
|---|---|
| Row height | 44px, 52px on touch |
| Rules | Ink 150 hairline between rows. **No zebra striping.** |
| Lane | A 3px left accent rule at radius 0, coloured by routing lane. This shows *who owns it*. |
| Status | Showing *where it has reached*: a pill with a written label in light mode, an 8px dot with the label in secondary text in dark mode (see Dark mode). **Lane and status are never merged into one colour.** |
| Dates | Plex Mono, right aligned, so a long queue scans vertically |
| Sort | Overdue first, then in progress by deadline, then open, then closed. **Never by severity:** severity is a judgement, a deadline is a fact. |
| Protected rows | Present so the count reconciles. No title, no detail, no assignee. |
| Empty cell | An en dash. Never blank, never zero. |
| Density | One only. A compact mode encourages tables too wide for the phone most sessions happen on. |

---

## Charts

From `ref-02`'s bar chart, with its palette replaced.

| Concern | Rule |
|---|---|
| Series | Vega 400 primary, Ink 500 comparison, Vega 200 secondary. **No fourth colour.** |
| More than three categories | The Vega scale with neutrals, never a sibling hue. The ageing ramp in `ref-02` is exactly what not to do. |
| Sample size | Always beside a percentage. A figure that hides its base contradicts the product's argument. |
| Type | Axis labels and all figures in Plex Mono, tabular |
| Grid | Ink 150, dropping to `#242422` in dark mode |
| Banned | Pie above three slices, dual axes, truncated value axes, 3D, a chart that draws itself on load |
| Comparison | Shown even when it is unflattering |

---

## Density and rhythm

The references are calm because they are consistent, not because they are empty.

| Gap | Value |
|---|---|
| Inside a component | 8 |
| Between components | 16 |
| Between groups | 24 |
| Between sections | 48 |
| Card padding | 24, or 16 on mobile |
| Page block-start margin | 32 |

**4, 8, 12, 16, 24, 32, 48, 64 and nothing else.** 14, 18, 20 and 30 do not exist in this
product. A value between 16 and 24 is the drift that makes a product look assembled rather
than designed.

---

## Mobile first, which the references are not

Every reference is desktop-led, and only `ref-07` carries a phone view at all. Actio's
majority session is a low-cost Android handset, mid-shift, one-handed. **Design the 360px
view first and let desktop inherit from it.**

| Desktop pattern | At 360px |
|---|---|
| 264px sidebar | Bottom bar, five destinations, labels always shown, never icons alone |
| 6-tile metric row | One column, inverted tile first, the rest below |
| Two-column card grid | One column, primary card first |
| Table with 6 columns | Rows, not a horizontal scroll. The two columns that matter, the rest on the detail view. |
| Top bar with 5 actions | Title and one primary. The rest move into the view. |
| Search with a shortcut chip | Search icon only. There is no keyboard. |

Touch targets 48 by 48 minimum, including inside tables. The zero-to-ten scale is the
most-tapped control in the product and is used one-handed, so it sits in the thumb zone.

---

## States

Every surface ships all of these. An uncovered state is a Major audit finding.

| State | Rule |
|---|---|
| Empty | An invitation. `Nothing overdue. Every open item is inside its deadline. The next check-in goes out on 21 March.` Never an apology, never "nothing here yet". |
| Loading | A plain indeterminate bar in Vega. **The seal is never a spinner.** No skeleton shimmer. |
| Partial | Some data, some pending, and the reader can tell which |
| Error | What happened, then the next step. The control beside the message where the action is possible from that screen. |
| Dense | The realistic worst case: 40 issues, longest locale, longest names |
| Protected | Row present, count reconciles, nothing to open |
| Below threshold | Degrades without leaking the cohort size to anyone but the reader |
| Offline | Answers held on device, stated plainly, sent on reconnect |

---

## Dark mode

Not an inversion of light mode. Cosmos is the page, and surfaces separate by moving to a
lighter grey rather than by casting a shadow, because a shadow is invisible on a near-black
ground.

The inversion rule flips: on a dark page the featured surface is the **card**
`#1A1A18`, lifted by lightness rather than by ground colour. Status becomes an 8px dot with
the label in secondary text, because filled pills add saturated colour to every row and
make a queue harder to scan.

Never pure white. Halo `#EFEFEF` reduces halation on the OLED screens night-shift workers
read in darkness.

> **Open item, raised for Shehab.** `BRAND.md` v1.5 still has no dark mode section. Its sections
> run 0 Identity, 1 Design tokens, 2 Contrast, 3 Typography, 4 The mark, 5 Voice,
> 6 Prohibited aesthetics, 7 Arabic, 8 Other locales, 9 Build order. The full dark mode
> token set exists only in `Actio-Brand-Guidelines-v1.pdf`, on the Dark mode and Dark mode:
> status and text pages. The two files are supposed to be versioned together, and a change
> to one without the other is a defect by the spec's own rule, so this is a gap in the
> machine-readable file rather than a licence to invent values. Until it is closed, take
> dark mode tokens from the PDF and cite the PDF, never a `BRAND.md` section number.

The tokens this system relies on, from the PDF: page `#0C0C0C`, card `#1A1A18`, rule
`#232320`, row rule `#1C1C1A`, primary text `#EFEFEF`, secondary text `#A8A8A4`, muted
`#6E6E69`, accent `#00BFC4` unchanged, accent text `#6FE0E5`, borders `#33332F` replacing
Ink 150, chart grid `#242422`, shadows removed entirely.

---

## Right to left

Built with logical properties throughout: `inline-start`, `inline-end`, `margin-inline`.
A layout built this way mirrors without a second stylesheet.

The sidebar moves to the inline-end. The lane accent rule moves with it. Numerals, charts,
media controls and identifiers do not mirror. The seal does not mirror; only the lockup
order does. Arabic sets one to two points larger with line height increased 15 to 20%.

---

## Pre-flight

Before any surface leaves the designer:

- [ ] 360px designed first, desktop inherits
- [ ] Exactly one inverted surface, or none
- [ ] Exactly one primary action
- [ ] Every value on the spacing scale
- [ ] Every figure in Plex Mono, tabular, with `n=` where it is a percentage
- [ ] Every status has a written label
- [ ] Lane and status are separate signals
- [ ] All eight states covered
- [ ] Both themes
- [ ] Mirrors for Arabic, holds at the longest locale
- [ ] Contrast measured against `BRAND.md` §2, with both hex values recorded
- [ ] No gradient, no shadow in flow, no tinted callout, no second accent, no sparkle
- [ ] Sentence case everywhere including buttons

Smoothness, from the section above:

- [ ] Panels lift by a tint step and space, never by an outline. Hairlines only between
      repeated records, on a structural chrome edge, or as a divider inside one surface.
- [ ] The featured figure takes Display 40/46 in Plex Mono. No mid-size softening the jump.
- [ ] Chrome removed before anything was styled: no border, legend, axis, gridline or
      icon that repeats its label
- [ ] One curve, nothing over 300ms, transform and opacity only, no content animating
      itself in on load, reduced motion honoured
- [ ] Every gap between elements is 8, 16, 24 or 48 and repeats down the page. Every other
      value is on the 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 scale.
- [ ] No card inside a card
- [ ] No greeting, no first person, and no personal name anywhere, including the meta line
      of a quote-led row

For every one of the five components this system adds, the spec states all seven:

- [ ] Dimensions, in scale values, including the touch size
- [ ] Type, by token, for every text part it carries
- [ ] Every state it can reach, each with its own treatment rather than a note
- [ ] Keyboard behaviour where it is interactive, naming the roles, the keys and where focus
      sits, or one line saying it is not interactive and how its meaning is written out
      instead
- [ ] Behaviour at 360px, including what is dropped and what is never dropped
- [ ] Dark mode, by token, with any pair outside the `BRAND.md` §2 table measured
- [ ] RTL, naming what mirrors, what does not, and which runs stay LTR

Component by component:

- [ ] **Pill tab group.** Active on the raised tint, never a Vega fill. Roving tabindex,
      arrow keys updating the panel on focus. No horizontally scrolling strip at 360px.
- [ ] **Collapsible section header.** Open by default, state per device. The body is removed
      when closed, not hidden. Title truncates before the count does.
- [ ] **Bare sparkline.** No axes, no gridlines, no legend, no tooltip. Not focusable, and
      the trend written out in text beside it. Dropped below 120px rather than squeezed.
- [ ] **Quote-led row.** Hairline separated, no card, no avatar, no name. One list is either
      all interactive or all static. The meta wraps at 360px rather than truncating.
- [ ] **Command palette.** The only lifted surface, and a full-height sheet with no shadow at
      360px. Focus stays in the input, selection moves by arrow key, Escape returns focus to
      the trigger.

And the `ref-04` test:

- [ ] Placed beside `ref-04`, a stranger can tell which product routes work to a named
      owner and which reports a mood

Then hand the string slot list to `ux-writer` and the spec to `ux-auditor`. The auditor
checks this list too, so a surface that fails here fails twice.
