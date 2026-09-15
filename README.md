<div align="center">

<img src="./logo/social/og-image-1200x630.svg" alt="Actio. Feedback that closes. A Lumofy product." width="840">

# Actio

**The accountability layer for engagement and culture surveys.**

Actio routes employee feedback to whoever can actually fix it, and does not let it close without proof.

<p>
<img src="https://img.shields.io/badge/Version-1-017E85?style=for-the-badge&labelColor=0C0C0C" alt="Version 1">
<img src="https://img.shields.io/badge/Product-coming_soon-0C0C0C?style=for-the-badge&labelColor=0C0C0C" alt="Product coming soon">
<img src="https://img.shields.io/badge/A_Lumofy-product-017E85?style=for-the-badge&labelColor=0C0C0C" alt="A Lumofy product">
</p>

</div>

---

## Version 1

This is the specification. The product is being built against it and is not here yet.

Version 1 fixes the decisions that are expensive to change later: what the product does, who it is for, what it measures, and every rule the interface is built to. Nothing in here is provisional, so the first screen can be written against a decision rather than a preference.

**What lands next:** design tokens, the self-hosted type stack, then the component set. Watch or star the repo if you want the first release.

---

## What Actio does

When an employee tells their employer something is wrong, a named person fixes it and the employee is told what happened.

Organisations collect feedback well and act on it badly. Around two thirds of employees believe nothing happens after a survey. Participation falls, the data degrades, and each round is worth less than the last.

| | |
|---|---|
| **65%** | of employees say nothing happens after a survey |
| **41%** | actual response rate at 1,000 to 5,000 employees |
| **37%** | have seen change since the previous survey |

Actio classifies every issue by who has the authority to change it, assigns it to a named owner with a date, and holds it open until evidence of the change is attached.

Sold to operations as retention infrastructure, not to HR as a culture programme.

---

## Why routing is the product

A team lead cannot change pay bands, shift rotation or career structure. Sending those findings to that person guarantees they are not fixed, and teaches the workforce that answering is pointless.

| Today | With Actio |
|---|---|
| Survey | Survey |
| Dashboard | Route by authority |
| Deck | Named owner and date |
| Nothing | Evidence attached |
| | Employee told |

Actio separates what a manager can solve from what operations, leadership or a protected case channel must solve, and tracks each to closure separately.

| Lane | Owns |
|---|---|
| Team lead | Workload, one to ones |
| Operations | Rosters, staffing |
| Leadership | Pay, career, policy |
| Protected | Misconduct and safety, handled as a case outside the queue |

**Measured on** first-90-day attrition, closure rate, and median days to close. Not a sentiment score.

Built for high-attrition frontline operations in Southeast Asia. Works over WhatsApp, SMS and web, in Bahasa Indonesia, English and Tagalog, with Arabic inherited from Lumofy. The reader is usually on a phone, often in a second language, often mid-shift, and is deciding whether honesty carries a cost.

---

## What is in this repository

| Path | What it is |
|---|---|
| [`BRAND.md`](./BRAND.md) | The machine-readable spec. Tokens, type, contrast, component rules, copy rules. Read this first if you are building anything. |
| [`Actio-Brand-Guidelines-v1.pdf`](./Actio-Brand-Guidelines-v1.pdf) | The same rules for people, with the reasoning and the measured numbers behind each one. |
| [`logo/`](./logo/) | The seal and the lockups, in every colourway. See [`logo/README.md`](./logo/README.md) for which file to use where. |

```
actio/
├── README.md
├── BRAND.md
├── Actio-Brand-Guidelines-v1.pdf
├── LICENSE
└── logo/
    ├── README.md
    ├── svg/
    │   ├── mark/          seal-{vega,cosmos,white,halo,currentcolor}.svg
    │   ├── horizontal/    actio-horizontal-{six colourways}.svg
    │   ├── wordmark/      actio-wordmark-{four}.svg
    │   ├── tagline/       lockup with "Feedback that closes."
    │   ├── bilingual/     Latin and Arabic, signage and certificates
    │   └── guides/        clear-space overlay for third parties
    └── social/            og-image-1200x630.svg
```

Vertical, Arabic, parent and descriptor lockups, the raster and app-icon exports and the print PDFs are named in [`logo/README.md`](./logo/README.md) and have not been exported yet.

---

## Roadmap

| # | Step | State |
|---|---|---|
| 1 | Specification: `BRAND.md`, the guidelines, the marks | Done |
| 2 | Tokens as CSS custom properties, Tailwind config and native resources | Next |
| 3 | Source Sans 3, IBM Plex Sans, Mono and Sans Arabic self-hosted as WOFF2 | Next |
| 4 | Contrast check running in continuous integration | Next |
| 5 | Components: button, input, select, status pill, card, table row, empty state, toast, modal, nav shell | Not started |
| 6 | Channels: WhatsApp utility templates, employee update, manager assignment email, SMS fallback | Not started |
| 7 | Dark mode and all four locales verified on a real handset | Not started |

`BRAND.md` and the guidelines PDF are versioned together. A change to one without the other is a defect.

---

## Licence and trademark

Proprietary. See [LICENSE](./LICENSE).

Third parties may use the horizontal lockup unmodified, with correct clear space, to state that their product integrates with Lumofy Actio, and where a mark is reproduced the accompanying text reads: *Actio and the Actio seal are marks of Lumofy.* Use of the seal alone, incorporation of the name into another product name or domain, modification of any mark, and application to merchandise are not permitted.

<div align="center">
<br>
<img src="./logo/svg/mark/seal-vega.svg" alt="" width="28">
<br><br>
<sub><b>Actio</b>, a product of <a href="https://lumofy.com">Lumofy</a>. Built by <a href="https://www.shehabberam.com/">Shehab Beram</a>.</sub>
</div>
