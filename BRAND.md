# Actio — Brand Spec (machine-readable)

> **For agents.** This file is the source of truth for any Actio interface, document or asset.
> If a rule here conflicts with a design instinct, follow this file.
> Companion document: `Actio-Brand-Guidelines-v1.pdf` (human-facing, same content, more context).
> Version 1.4 · September 2026.

---

## 0. Identity

| Field | Value |
|---|---|
| Product | Actio |
| Parent | Lumofy |
| Correct first mention | `Actio, a Lumofy product` |
| Primary lockup | `Lumofy Actio` |
| Legal form | `Lumofy — Actio` |
| Tagline | `Feedback that closes.` |
| Domain pattern | `lumofy.com/actio` or `actio.lumofy.com` |
| Supersedes | Lumofy Engage (retired — do not use Engage marks or `#FF7E2E`) |

Never present Actio alone in a commercial context. The Lumofy house mark is what distinguishes the product name from unrelated marks in adjacent software categories, so the two always appear together.

**What the product does.** most tools tell an organisation what is wrong; Actio decides who is fixing it and will not let them close it without proof.

---

## 1. Design tokens

Emit these to `tokens.json` → CSS custom properties, Tailwind config, iOS/Android resources. Never hardcode a value in a component.

### 1.1 Colour — core

```json
{
  "cosmos": "#0C0C0C",
  "halo":   "#EFEFEF",
  "sirius": "#215BEA"
}
```

`cosmos` = primary dark (text, dark surfaces). `halo` = primary light (page, cards).
`sirius` = **Lumofy parent only.** Permitted in the account switcher and parent wordmark. **Never** an Actio interface colour. Two accents makes a suite look incoherent.

### 1.2 Colour — Vega (the Actio accent)

```json
{
  "vega-50":  "#E6FAFB",
  "vega-100": "#B4F0F2",
  "vega-200": "#6FE0E5",
  "vega-400": "#00BFC4",
  "vega-500": "#00A2A8",
  "vega-600": "#017E85",
  "vega-700": "#02646B",
  "vega-800": "#03474D",
  "vega-900": "#022E33"
}
```

Hue 182°. Chosen because it is the only gap in the Lumofy wheel: 33° from Aurora, 41° from Sirius, and 159° from the terracotta associated with consumer AI assistants.

### 1.3 Colour — neutrals

```json
{
  "ink-900": "#0C0C0C",
  "ink-700": "#3A3A38",
  "ink-500": "#6B6B68",
  "ink-300": "#A8A8A4",
  "ink-150": "#D8D8D4",
  "ink-50":  "#F6F6F4"
}
```

### 1.4 Colour — state (routing lanes)

```json
{
  "state-open":        "#6B6B68",
  "state-in-progress": "#017E85",
  "state-overdue":     "#B4251F",
  "state-closed":      "#1D7A56",
  "state-protected":   "#5B3FA8"
}
```

`state-protected` is violet so that a misconduct report does not read as an error or an overdue task. It is a different class of item and the colour should say so before the label does.

**Never** repurpose Lumofy sibling accents (Aurora `#5AE29C`, Stellar `#E2E05A`, Nova `#E05A90`, Eclipse `#A366FF`) as status colours.

### 1.5 Layout, motion, elevation

```json
{
  "base-unit": 4,
  "space": [4, 8, 12, 16, 24, 32, 48, 64],
  "radius-control": "8px",
  "radius-card": "12px",
  "radius-pill": "999px",
  "border-hairline": "1px solid #D8D8D4",
  "border-strong": "1px solid #A8A8A4",
  "control-height-desktop": "40px",
  "control-height-touch": "48px",
  "min-touch-target": "48px",
  "shadow-inflow": "none",
  "shadow-overlay": "0 8px 24px rgba(12,12,12,0.10)",
  "focus-ring": "0 0 0 2px #00BFC4",
  "focus-offset": "2px",
  "motion-micro": "120ms cubic-bezier(0.2,0,0.2,1)",
  "motion-panel": "200ms cubic-bezier(0.2,0,0.2,1)",
  "motion-max": "300ms"
}
```

Respect `prefers-reduced-motion` on every transition, no exceptions.
No rounded corners on single-sided borders — if a card uses `border-left` as an accent, set `border-radius: 0`.

---

## 2. Contrast — measured, enforce these

| Pair | Ratio | Verdict |
|---|---|---|
| Cosmos on Halo | 17.0:1 | pass |
| White on Cosmos | 18.4:1 | pass |
| **Cosmos on Vega 400** | **8.62:1** | **pass — this is the correct pattern for orange/teal fills** |
| Vega 600 on white | 4.86:1 | pass (body text) |
| White on Vega 700 | 6.91:1 | pass |
| Ink 500 on white | 5.35:1 | pass (secondary text) |
| **Vega 400 on white** | **2.27:1** | **FAIL — never body text** |
| **White on Vega 400** | **2.27:1** | **FAIL** |
| Stellar on white | 1.40:1 | FAIL |

**Rule:** dark text on a Vega fill; Vega 600 or darker for Vega text on a light ground. Reversing this is the most likely accessibility failure in the system, because teal reads as darker than it measures.

Target: WCAG 2.2 AA. Any new pair must be measured before use.

---

## 3. Typography

```json
{
  "display": { "family": "Source Sans 3", "weight": 600, "size": 40, "leading": 46, "tracking": "-0.025em" },
  "h1":      { "family": "Source Sans 3", "weight": 600, "size": 30, "leading": 38, "tracking": "-0.02em" },
  "h2":      { "family": "Source Sans 3", "weight": 600, "size": 22, "leading": 30, "tracking": "-0.015em" },
  "h3":      { "family": "IBM Plex Sans", "weight": 600, "size": 18, "leading": 26 },
  "body":    { "family": "IBM Plex Sans", "weight": 400, "size": 15, "leading": 24 },
  "small":   { "family": "IBM Plex Sans", "weight": 400, "size": 13, "leading": 20 },
  "caption": { "family": "IBM Plex Sans", "weight": 500, "size": 12, "leading": 16 },
  "metric":  { "family": "IBM Plex Mono", "weight": 500, "size": 28, "leading": 32 },
  "label":   { "family": "IBM Plex Mono", "weight": 400, "size": 12, "leading": 16, "tracking": "0.02em" }
}
```

**Hard rules**

- Two body weights only: 400 and 600. Never 300 (collapses on low-end Android), never 800.
- Every number sets in IBM Plex Mono — response rates, days-to-close, counts, dates, case IDs, currency. `font-variant-numeric: tabular-nums` on all numeric columns.
- Sentence case everywhere. No Title Case. No all-caps except Plex Mono labels at 12px with 0.02em tracking.
- Maximum measure 68 characters.
- Never letterspace lowercase body text.
- Self-host as WOFF2, subset to Latin + Latin Extended + Arabic. **Never load fonts from a public CDN, because frontline users are on constrained connections and a blocked request produces an unreadable survey.**
- Arabic: IBM Plex Sans Arabic. Match existing Lumofy AR mark weights before diverging.

---

## 4. The mark

**Name:** the seal. A **Reuleaux triangle** — a curve of constant width — with a circular aperture.

**Construction rationale.** Every Lumofy mark is a path shape drawn in one system: discs at grid points joined by connectors of equal width. Each product owns a different path, and Actio owns the only closed one. A Reuleaux triangle and a circle are both curves of constant width, so the mark nests two forms that measure the same in any orientation. It reads as an A at large sizes and as a seal at small ones.

**Geometry** — 100 × 100 grid:

```
form:            Reuleaux triangle
circumradius:    33
centre:          50, 54.4        # optically centred, not geometric
vertices:        -90deg, 30deg, 150deg on the circumcircle
side / arc r:    57.158          # R * sqrt(3); each arc centred on the opposite vertex
aperture:        r 15 at (50, 53.4)
wall (thinnest): 13.6
fill-rule:       evenodd         # the aperture knocks out on any ground
gradient:        none, ever
corners:         natural arc intersections — never manually rounded
```

**Clear space:** one aperture diameter (30 units) on all sides.
**Minimum size:** 16px digital / 6mm print for the seal; 84px / 24mm for the horizontal lockup. Below 24px ship the dedicated raster — do not scale the SVG.
**Lockup gap:** seal-to-wordmark = one aperture diameter. Never re-space.

**Files:** see `logo/README.md` for the full map. Summary:

```
logo/svg/mark/seal-{vega,cosmos,white,halo,currentcolor}.svg
logo/svg/horizontal/actio-horizontal-{vega-on-light,vega-on-dark,cosmos,white,halo}.svg
logo/svg/vertical/actio-vertical-{...}.svg
logo/svg/arabic/actio-arabic-{horizontal,vertical}-{...}.svg
logo/svg/parent/lumofy-actio-horizontal-{...}.svg
logo/png/...        transparent, 16-1600px
logo/app-icon/...   ios, rounded, round, inverse, maskable, favicons
```

All SVG wordmarks are outlined, so no font is required to render them.

**Misuse — all prohibited:** rotate · outline · gradient · shadow or glow · fill the aperture · stretch non-uniformly · recolour outside the approved set · enclose in a container shape · crop · use as a bullet, divider or pattern · animate beyond the approved reveal · place on a photograph without a plate · redraw in another tool.

**Approved reveal (the only animation):** aperture scales 0.9 to 1 over 200ms on the standard curve. Nothing else.

**Backgrounds:** Vega on Halo/white (default) · white or Vega on Cosmos · Cosmos on Vega · Vega on Ink 50. **Never white on Vega.**


---

## 5. Voice

Actio writes in the register of a competent operations lead: someone who has already read the file and is reporting what is being done about it. It is not a character, has no name it speaks in, and does not use the first person.

| Write this | Not this |
|---|---|
| Assigned to Dewi, due 14 March | Action item successfully created! |
| 3 of 8 actions closed this cycle | You're crushing it this quarter |
| We can't change pay bands. Here's why. | We're looking into it |
| 41% responded (n=612) | Great engagement! |
| This goes to your site director | Escalating to leadership |
| Couldn't send. Check the number. | Oops! Something went wrong |

**Banned words:** empower, seamless, unlock, leverage, journey, supercharge, delight, effortless, revolutionise.
**Banned punctuation:** exclamation marks in system copy.
**Banned in product UI:** emoji.

Always publish the sample size beside a percentage. The product argues against inflated benchmarks, so a figure that hides its base contradicts the argument.

In employee-facing copy, describe the mechanism rather than the intention. A sentence such as "your manager sees this grouped with 11 other responses and cannot filter below 5 people" is more persuasive than a statement that responses are confidential.

---

## 6. Prohibited aesthetics

These are specified rather than left to judgement. The category is full of products that look interchangeable, and the current default aesthetic for AI software is the fastest route to becoming one of them. A screenshot that could be dropped into a generic software landing page without anyone noticing has failed.

```
BANNED:
  purple-to-blue or pink-to-violet gradients
  mesh gradients, aurora blurs, glassmorphism, frosted panels
  glow, neon edges, coloured drop shadows
  Inter / Poppins / Montserrat as substitutes for the stack in §3
  rounded-everything (radius is 8px controls / 12px cards; pills for tags only)
  3D blobs, floating spheres, isometric illustration
  sparkle / star / wand icons to denote AI
  stock photography of colleagues laughing at a laptop
  emoji in product UI
  dark-mode marketing pages with a neon accent
  terracotta or amber accents (collides with consumer AI branding)

REQUIRED INSTEAD:
  flat fills, hairline borders, real whitespace
  one accent used sparingly (~70% neutral / 20% ink / 10% Vega)
  monospace numerals
  diagrams over illustration — draw the mechanism
  documentary photography of real working environments, uncorrected
```

**Icons:** line only, 1.5px stroke, 24px grid, round caps to echo the mark. Tabler or Lucide. Filled icons only for the active nav state. No icon is ever the sole carrier of meaning.

**Charts:** Vega 400 primary series, Ink 500 comparison, Vega 200 secondary. Never use the Lumofy palette as a categorical scale. Axis labels and figures in Plex Mono. No pie above three slices, no 3D, no dual axes.

---

## 7. Arabic

Arabic is inherited from Lumofy and is a first-class setting, not a translation layer.

### 7.1 The wordmark

| Field | Value |
|---|---|
| Arabic form | `أكتيو` (transliteration, not translation) |
| Parent lockup | `لوموفاي أكتيو` |
| Lockup order | Seal sits to the **right** of the wordmark |
| Seal mirroring | **The seal does not mirror.** It is symmetrical about its vertical axis, so it is identical when flipped. Only the lockup order changes. |
| Files | `logo/lockup-arabic.svg`, `logo/lockup-arabic-reversed.svg`, `logo/lockup-arabic-parent.svg` |

Earlier guidance to mirror the mark itself was wrong and is superseded.

### 7.2 Typography

| Rule | Value |
|---|---|
| Face | IBM Plex Sans Arabic — Regular 400, Medium 500, SemiBold 600 |
| Size | Set 1–2pt larger than the equivalent Latin size |
| Line height | Increase 15–20% over the Latin setting |
| Weights | Real weights only. Never synthesise a bold — letterforms distort and joins break. |
| Letterspacing | **Never.** Arabic letters join; tracking breaks the connections. |
| Case | No capitalisation exists in Arabic. Emphasis comes from weight or position. |
| Justification | No kashida elongation in the interface. Set ragged. |
| Numerals | Western Arabic (0–9) in Plex Mono. Eastern Arabic numerals are not used. |
| Punctuation | Arabic comma `،`, semicolon `؛`, question mark `؟`. Full stop is shared. |
| Register | Modern Standard Arabic. No dialect. |

### 7.3 Mirroring

```
MIRRORS:
  layout and columns        reading order reverses
  lockup order              seal moves to the right
  directional icons         arrows, chevrons, back/forward, indentation
  progress bars, sliders    fill originates from the right

DOES NOT MIRROR:
  the seal                  symmetrical on its vertical axis
  non-directional icons     clock, search, calendar, lock, chart, user
  numerals and figures      read LTR inside an RTL line
  charts                    value axes keep conventional direction
  media controls            play/skip follow the tape, not the script
  phone numbers, code, IDs  always LTR regardless of surrounding direction
```

**Implementation:** use logical CSS properties throughout — `inline-start` / `inline-end` rather than `left` / `right`, `margin-inline` rather than `margin-left`. A layout built this way mirrors without a second stylesheet.

**Mixed strings:** wrap Latin runs inside Arabic sentences in `dir="ltr"` with `unicode-bidi: isolate`. Without it, numbers and identifiers reorder unpredictably.

**Testing:** every screen is reviewed in Arabic before release, not translated after layout sign-off.

### 7.4 Length

Arabic sets roughly 15% shorter than English, so an interface designed for Bahasa Indonesia will accommodate it. Verify rather than assume.

---

## 8. Other locales

| Locale | Note |
|---|---|
| Bahasa Indonesia | Runs 15–20% longer than English |
| Tagalog | Can run further than Indonesian |
| Plurals | **Never concatenate a string containing a count.** Indonesian and Tagalog pluralise differently from English. |
| Names | Support single-name users. Many Indonesian employees have one legal name; a form demanding a surname excludes them. |
| Idiom | No idioms, metaphors or wordplay in any locale. |
| Dates | `DD MMM YYYY`. Never numeric-only — `03/04` is ambiguous. |


---

## 9. Build order

1. Tokens (`tokens.json` → CSS vars, Tailwind, native)
2. Components: button → input → select → status pill → card → table row → empty state → toast → modal → nav shell *(≈80% of the product)*
3. Templates: WhatsApp utility templates (submit to Meta as **utility**, not marketing), employee "what we heard" update, manager action-assignment email
4. Accessibility gate: WCAG 2.2 AA, every colour pair measured
