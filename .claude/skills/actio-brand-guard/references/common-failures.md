# The brand failures that actually happen

Moved verbatim from `actio-brand-guard/SKILL.md` on 2026-10-07. Read it when a pre-flight line
fails, for the usual cause and the fix. `ux-auditor` never copies a fix from this table into a
finding.

Ordered by how often they occur, with the fix beside each.

| Failure | Why it happens | Fix |
|---|---|---|
| White text on a Vega fill | Teal reads darker than it measures, so it looks fine on a designer's screen | Cosmos on Vega. Always. |
| Vega 400 used as link or body text on white | It is "the brand colour", so it feels correct | Vega 600 or darker |
| A second accent creeps in for a chart series or a badge | Three categories, one accent, so someone reaches for a sibling hue | Vega 400 primary, Ink 500 comparison, Vega 200 secondary. Nothing else. |
| A 20px or 18px gap | The eye wants a value between 16 and 24 | Pick 16 or 24. The gap between them is the point of a short scale. |
| Numbers set in the body face | The component was built before anyone read the type rules | Plex Mono, tabular, every number |
| A percentage with no sample size | It reads cleaner | It contradicts the product's own argument. Add `n=612`. |
| Two primary buttons on one view | Both actions feel important | One is primary. The other is secondary, and if that is wrong the screen has two jobs. |
| Rounded corners on a left accent rule | The component library rounds everything | Radius 0 on single-sided borders |
| A shadow used to separate two cards | Depth is the habit | The tint step and space. Only overlays lift. A hairline separates repeated records; it does not lift a panel. |
| Title Case on a button | Most design systems do it | Sentence case. Everywhere. |
| An empty state that apologises | It feels polite | An empty state is an invitation. Never "nothing here yet", never an apology. |
| A toast that congratulates | It feels friendly | A toast states a fact in the past tense with one undo. It does not congratulate. |
| Layout built with `margin-left` | Nobody was thinking about Arabic | `margin-inline-start`. Logical properties throughout. |
