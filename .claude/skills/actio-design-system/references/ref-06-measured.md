# `ref-06` measured, the divergences, and what smoothness is not

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when composing a new
screen's overall layout, and whenever a spec takes one of the declared departures: the queue's
48px density, the quote-led row height, the 16px identity mark at a 4px radius, or the featured
figure as Plex Mono 500 at Display 40/46. The five signatures, the row-height rule, the counting
rule and the anti-generic check stay in the core skill.

## What `ref-06` actually does, measured

Read this before the smoothness section. It is the correction to the most likely failure of
this whole system: producing a competent, generic SaaS dashboard and calling it done.

`ref-02` is an operations dashboard. `ref-06` is not a dashboard at all, and the difference
is not decoration. Measured off the reference at its native width:

| | `ref-06` | A generic dashboard | Actio takes |
|---|---|---|---|
| Elements on the whole screen | About twelve | Forty or more | **Twelve, counted.** See the counting rule below. Thirteen is a finding, not a judgement call. |
| Nav label size | Generous, nowhere near a 13px nav | 13 to 14px | Body 15/24. Every heading token in the scale is weight 600, so here the air carries it, not the type size. |
| Nav row height | Very tall, near 80px at native | 36 to 40px | 64px, and 48px of space between groups. 56 is not on the space scale; 64 is, and it is the closer of the two to the reference. |
| Sidebar ground | **The same as the canvas.** A 1px rule is the only separation. | A distinct panel colour | The same ground, one hairline |
| Icon position | **Inline-end, after the label** | Inline-start, before it | Inline-end |
| Panels on the screen | **Two, very large** | Six small tiles in a row | Two or three, large |
| Panel padding | Roughly double a conventional card | 16 to 24px | **48 on a metric tile**, 32 at tablet, 24 on mobile. Other cards stay at 24. |
| The figure | Display size, and **not bolded past the face's own weight** | 24 to 32px, bold | Plex Mono 500 at 40/46. §3 requires every number in Plex Mono and sizes Display at 40/46, but it defines no mono token at that size, so this is a **declared composite**, listed in the departures table. Mono 500 reads as regular. Nothing heavier. |
| Figure to its own label | About 2.5 to 1 | 1.5 to 1 | 2.5 to 1 or more |
| Weight range used | Almost none. Section headings only. | Bold everywhere | 600 on headings, the mono face's 500 on figures, 400 for everything else |
| Identity marks | Rounded squares, substantial | 8px dots | 16px rounded squares at a 4px radius, a **declared departure** listed in the departures table |
| List row height | Enormous. Two rows fill a section. | 44 to 52px | Depends on the surface. See below. |

### Where Actio deliberately diverges, and why

Not everything in `ref-06` serves this product, and copying it wholesale would be its own
kind of failure.

| `ref-06` | Actio | Why |
|---|---|---|
| List rows near 170px | The **queue** stays at 48px | A team lead has twenty minutes between shifts and forty issues. Sana's row height would show four. Density is the queue's job. 48 is 12 + 24 + 12 and is also `min-touch-target`, so the row needs no separate touch height. |
| Rows near 170px | The **verbatim feedback list** takes the quote-led row height specified in its own component section, which grows with the quote | Here Sana is right. A quote is read, not scanned, and this is the surface where the employee's words are the content. The number lives in one place, not two. |
| Card radius around 20px | 12px | `BRAND.md` §1.5 sets `radius-card`. Changing it is a spec amendment, not a design choice, and it has not been made. |
| Colour identity marks per collection | Lane colours only, from the status set | Actio owns one accent. The identity marks carry the routing lane, which is meaning, not decoration. |
| A greeting by name | None | Actio has no first person. The queue opens with work. |
| No mark radius is declared | The 16px identity mark takes a 4px radius | `BRAND.md` §1.5 declares three radii and every one of them is at or past half of 16px, so 8, 12 and 999 all render the mark as the dot this system reserves for the command palette. **Declared departure**, pending a §1.5 amendment. |
| No mono token above 28/32 | The featured figure is Plex Mono 500 at 40/46 | §3 requires numbers in Plex Mono and sizes Display at 40/46, but pairs that size with Source Sans. The featured figure needs both rules at once. **Declared composite**, pending a §3 amendment. |

**The queue is the one surface that is deliberately denser than the reference.** Everywhere
else, if you are choosing between Sana's spacing and a conventional dashboard's, take
Sana's.

### What smoothness is not

| Not | Because |
|---|---|
| A gradient, a glow, a frosted panel | On the off-brand list, and they read as decoration on an instrument |
| A longer transition | Over 300ms reads as lag, not polish |
| A spring or an overshoot | One curve. A bouncing panel is a toy. |
| A greeting by name | `ref-07` opens with "Hello, Sofie". Actio has no first person and does not greet. The queue opens with work. |
| A larger radius | 8 controls, 12 cards, 999 pills, 4 on the 16px identity mark, 0 on a single-sided border, and nothing else |
| More whitespace everywhere | Rhythm, not emptiness. A dense queue is correct when the reader came to scan forty items. |
