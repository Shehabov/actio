# Command palette

The single source for this component. Moved verbatim from `actio-design-system/SKILL.md` on
2026-10-07; the restatements that were in `actio-ux-audit` and `ux-auditor.md` now point here,
and where they had drifted this text won. Read it whenever a surface uses the component: the
designer specifies all seven headings from it, with the values for that surface, and the
auditor proves it with the Audit block at the end. Sections it names (Smoothness, the chart
rules, Dark mode, the inversion rule) are in the core skill or a reference its References
table names.

From `ref-05`. For an operator moving between sites, cycles and issues quickly.

**Dimensions**

| Part | Spec |
|---|---|
| Surface | Raised two steps, 12px radius, the overlay shadow token. The only lifted surface in the product. |
| Size | 560px wide, centred, 96px from the block-start of the viewport. Maximum height 480px, after which the list scrolls inside while the input stays fixed. |
| Input | 56px tall (16 + 24 + 16), no border, no ground of its own |
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
| Selected row | The ground steps one away from the popover surface: Ink 50 in light mode, stepping back toward the page, and `#232320` in dark, the hover step **above** the `#1A1A18` surface rather than the same value as it. Never a Vega fill, which would spend the accent budget on a menu row. |
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

## Audit

The component-specific proofs. The checks every component shares (all seven headings present,
dark mode by token, RTL stated) and the severities are in `actio-ux-audit` §7. On a spec, read
each row off the named heading; on built UI, use the method given.

| Failure | How you prove it |
|---|---|
| Focus leaking behind the palette, left on `body` after Escape, or moved off the input by the arrow keys | Spec: the Keyboard heading names `aria-activedescendant`, Escape returning focus to the trigger and Tab cycling inside only. Built UI: keyboard trace |
| A floating palette with a shadow at 360px, or a shortcut column kept there | Spec: the 360px heading. Built UI: capture at 360px |
| In dark mode, the overlay shadow kept, or the surface, its border and the selected row not three different values | Read the dark tokens off the spec: surface `#1A1A18`, border `#33332F`, selected row `#232320` |
| Matches interleaved by relevance score rather than ordered by section | Spec: the Typing state |
| A selected row on a Vega fill | Read the selected-row ground. It spends the accent budget on a menu row |
| An identifier reversed under RTL, or the dot and the shortcut not swapping ends | Spec: the RTL heading. Built UI: render under `dir="rtl"` |

Pre-flight line: the only lifted surface, and a full-height sheet with no shadow at 360px.
Focus stays in the input, selection moves by arrow key, Escape returns focus to the trigger.
