# The queue

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when the surface
shows the issue queue or any list of issues. Row heights are composed, per the core skill.

The default view, and the screen the product lives or dies on.

| Concern | Rule |
|---|---|
| Row height | 48px (12 + 24 + 12). The same on touch, because 48 is already `min-touch-target`. |
| Rules | Ink 150 hairline between rows. **No zebra striping.** |
| Lane | A 3px left accent rule at radius 0, coloured by routing lane. This shows *who owns it*. |
| Status | Showing *where it has reached*: a pill with a written label in light mode, an 8px dot with the label in secondary text in dark mode (see Dark mode). **Lane and status are never merged into one colour.** |
| Dates | Plex Mono, right aligned, so a long queue scans vertically |
| Sort | Overdue first, then in progress by deadline, then open, then closed. **Never by severity:** severity is a judgement, a deadline is a fact. |
| Protected rows | Present so the count reconciles. No title, no detail, no assignee. |
| Empty cell | An en dash. Never blank, never zero. |
| Density | One only. A compact mode encourages tables too wide for the phone most sessions happen on. |
