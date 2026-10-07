# Smoothness, in full

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. The core skill holds the
rules as one table; read this when you are composing a surface, when a spec takes the tint step
or a hairline, or when an auditor's smoothness finding is contested. "What smoothness is not" is
in `ref-06-measured.md`.

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
