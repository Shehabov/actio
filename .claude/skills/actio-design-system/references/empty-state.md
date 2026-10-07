# Empty state

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when a surface
specifies its empty state (every surface has one). The state itself is the first row of the
States table in the core skill.

Every surface ships one, and left unspecified this is where a generic screen gets in: the
conventional empty state is a big centred graphic with a heading, a paragraph and a button.

| Part | Spec |
|---|---|
| Mark | The seal at 24px. `BRAND.md` §4 sets a 16px minimum and requires the dedicated raster below 24px, so 24 is the smallest size that still ships as SVG. |
| Sentence | 16 below the mark. Body 15/24, Ink 900, **one sentence**, naming what will appear here and what puts it there. |
| Action | 24 below the sentence. One text action, or none. Never a filled button: an empty surface has not earned the accent. |
| Placement | **Left-aligned inside the panel the state belongs to**, on that panel's own ground, starting at the panel's inline-start padding. Never centred in the viewport, never in a dashed box. |
| Height | The panel keeps the height it would have had with one row of content, so nothing jumps when data lands. |
| Banned | Illustration, spot graphic, outline drawing, dashed placeholder border, a second paragraph, an emoji, an apology, "nothing here yet", "no data". |

The words are the `ux-writer`'s and carry the same rule as everything else: say what will
appear and what causes it. `No issues are open at this site. One appears here when a
response is routed.` is the shape.
