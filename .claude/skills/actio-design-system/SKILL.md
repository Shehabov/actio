---
name: actio-design-system
description: The Actio platform design system, derived from the approved visual references in docs/design-reference. Use when designing or building any Actio surface: the app shell, navigation, metric tiles, cards, the queue, tables, status, empty states or the composer. Covers layout anatomy, density, the inversion rule, mobile-first translation, and which reference patterns are adopted, adapted or rejected.
---

# The Actio design system

Three references in [`docs/design-reference/`](../../../docs/design-reference/) set the
platform shape the Product Lead wants. This skill turns them into rules.

| Reference | What it contributes |
|---|---|
| `ref-01-assistant-shell.png` | Sidebar grouping with small-caps section labels, search with a shortcut chip, centred empty state, suggestion cards |
| `ref-02-ops-dashboard.png` | **The primary reference.** Metric tile row, the inversion rule, count badges on navigation, card taxonomy, right-aligned figures, alert rows, ageing bars |
| `ref-03-minimal-canvas.png` | Icon rail, restraint at rest, how little a screen can carry and still feel finished |

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
| Org switcher at the top of the sidebar | **Adopt** | This is the only place Sirius appears. |
| Metric tile row: label, figure, sub-label, delta | **Adopt** | Figures in Plex Mono. Every percentage carries `n=`. |
| One inverted surface per view to feature a single thing | **Adopt** | See the inversion rule below. It replaces "accent everywhere". |
| Card on neutral ground, hairline border, moderate radius | **Adopt** | 12px cards, Ink 150 hairline, no shadow in flow. |
| Right-aligned numeric columns | **Adopt** | Plex Mono, tabular figures, aligned on the decimal. |
| Status pills on list rows | **Adapt** | Light mode: pill with written label. Dark mode: 5px dot, label in secondary text. Never colour alone. |
| Top bar: title, subtitle with period, actions right | **Adopt** | Sentence case throughout. |
| Search with a keyboard shortcut chip | **Adopt** | Chip in Plex Mono 12px. |
| Centred empty state with a mark and one action | **Adopt** | An invitation, never an apology. Never "nothing here yet". |
| Suggestion cards under a composer | **Adapt** | Only where the reader genuinely has a choice of next action. Not decoration. |
| **Lime / chartreuse accent** | **Reject** | Vega `#00BFC4` is the only colour Actio owns. Lime sits beside Stellar `#E2E05A`, a Lumofy sibling accent, banned in Actio UI. |
| **Soft gradient glow on the canvas and promo card** | **Reject** | Gradients, mesh and aurora blurs are on the off-brand list. Flat fills only. |
| **Multi-hue colour ramp for ageing buckets** | **Reject** | A sibling hue never appears, including in charts. Use the Vega scale with neutrals. |
| **Tinted callout boxes for alerts** | **Reject** | Explicitly off-brand. Use a left accent rule at radius 0 and a hairline. |
| **Three or more accent elements in one view** | **Reject** | One accent per view. Where two elements read as primary, neither is. |
| **Title Case on buttons and headings** | **Reject** | Sentence case everywhere. `New invoice`, not `New Invoice`. |
| **Sparkle icon on the composer** | **Reject** | No sparkle, star or wand. Actio does not advertise its AI. |
| **Desktop-first density** | **Reject** | The 360px view is designed first and desktop inherits from it. |
| Rounded corners on every container | **Reject** | 8px controls, 12px cards, 16px modals, 999px pills, 0 on single-sided borders. Nothing else. |

### The references do not define colour. Settled.

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
| Section labels | Plex Mono 12px 500, 0.02em tracking, Ink 500, uppercase. The one permitted uppercase in the product. |
| Nav item | 40px tall, 8px radius, 8px gap icon to label, Plex Sans 15/24. Active is a Vega 50 fill with Vega 800 text, never a Vega 400 fill with white. |
| Count badge | Plex Mono 12px tabular, inline-end aligned. Overdue counts take the overdue status colour; everything else is Ink 500. |
| Top bar | 64px. Title H2, subtitle Small in Ink 500 on one line beneath. Actions inline-end. **Exactly one primary.** |
| Canvas | Ink 50 ground. Data width 1200px, reading width 720px. Margins 64 / 32 / 16 by breakpoint. |
| Account area | Sidebar foot. Lumofy wordmark and product switcher. The only place Sirius appears. |

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
| Why Vega 200 and not Vega 400 | On Cosmos, Vega 400 measures 8.62:1 and is approved; Vega 200 reads brighter at small sizes and matches the dark-mode accent-text token, so one token serves both |
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
| Figure | Plex Mono 500, 28/32, tabular. Ink 900, or Vega 200 on an inverted tile. |
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
| **Alert row** | Something needs attention | **Left accent rule 3px at radius 0**, hairline border, Ink 50 ground. Never a tinted fill. Icon, message, then one text action. |
| **Metric tile** | A reading | No chrome. See above. |

Rules that hold for all of them:

- 12px radius, Ink 150 hairline, no shadow. Only overlays lift.
- 24px padding. 16px on mobile.
- **A card never contains another card.** Group inside a card with a hairline and space.
- Every issue card carries its identifier, Plex Mono, block-end inline-end. It is how
  support conversations locate an item.

---

## The queue

The default view, and the screen the product lives or dies on.

| Concern | Rule |
|---|---|
| Row height | 44px, 52px on touch |
| Rules | Ink 150 hairline between rows. **No zebra striping.** |
| Lane | A 3px left accent rule at radius 0, coloured by routing lane. This shows *who owns it*. |
| Status | A pill showing *where it has reached*. **Lane and status are never merged into one colour.** |
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

All three references are desktop. Actio's majority session is a low-cost Android handset,
mid-shift, one-handed. **Design the 360px view first and let desktop inherit from it.**

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
`#1A1A18`, lifted by lightness rather than by ground colour. Status becomes a 5px dot with
the label in secondary text, because filled pills add saturated colour to every row and
make a queue harder to scan.

Never pure white. Halo `#EFEFEF` reduces halation on the OLED screens night-shift workers
read in darkness.

> **Open item, raised for Shehab.** `BRAND.md` v1.4 has no dark mode section. Its sections
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
- [ ] Contrast measured with both hex values recorded
- [ ] No gradient, no shadow in flow, no tinted callout, no second accent, no sparkle
- [ ] Sentence case everywhere including buttons

Then hand the string slot list to `ux-writer` and the spec to `ux-auditor`. The auditor
checks this list too, so a surface that fails here fails twice.
