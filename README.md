<div align="center">

<img src="./brand/assets/actio-og-cosmos.svg" alt="Actio. Feedback that closes. A Lumofy product." width="840">

# Actio

**The accountability layer for engagement and culture surveys.**

Actio routes employee feedback to whoever can actually fix it, and does not let it close without proof.

<p>
<img src="https://img.shields.io/badge/A_Lumofy-product-017E85?style=for-the-badge&labelColor=0C0C0C" alt="A Lumofy product">
<img src="https://img.shields.io/badge/Stage-brand_foundation-0C0C0C?style=for-the-badge&labelColor=0C0C0C" alt="Stage: brand foundation">
<img src="https://img.shields.io/badge/Guidelines-v1.1-017E85?style=for-the-badge&labelColor=0C0C0C" alt="Brand guidelines v1.1">
<img src="https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-017E85?style=for-the-badge&labelColor=0C0C0C" alt="WCAG 2.2 AA">
<img src="https://img.shields.io/badge/Locales-EN_·_ID_·_TL_·_AR-0C0C0C?style=for-the-badge&labelColor=0C0C0C" alt="Locales: English, Bahasa Indonesia, Tagalog, Arabic">
</p>

</div>

---

## Contents

- [What is in this repository today](#what-is-in-this-repository-today)
- [What Actio does](#what-actio-does)
- [Why routing is the product](#why-routing-is-the-product)
- [What we measure](#what-we-measure)
- [The brand in one screen](#the-brand-in-one-screen)
- [Repository structure](#repository-structure)
- [Using the marks](#using-the-marks)
- [Build order](#build-order)
- [Open items](#open-items)
- [Licence and trademark](#licence-and-trademark)

---

## What is in this repository today

The brand, and nothing else. No product code has been written.

Actio's own guidelines say that tokens, self-hosted fonts, the seal files and a contrast check belong in the repository before the first commit of product code. This is that commit. Everything below describes what the product will be, so that the first line of code is written against a decision rather than a preference.

| Here now | Not here yet |
|---|---|
| Brand guidelines v1.1, the full 70 page document | Design tokens as CSS custom properties and Tailwind config |
| [`BRAND.md`](./BRAND.md), the same rules in a form an agent can read | Self-hosted WOFF2 for Source Sans 3, IBM Plex Sans, Mono and Sans Arabic |
| Seal in four colourways, horizontal lockups, clear-space overlay | App icons, favicons, raster exports, print PDFs |
| Bilingual and tagline lockups | Component library, WhatsApp templates, product code |

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

---

## What we measure

First-90-day attrition, closure rate, and median days to close. Not a sentiment score.

Built for high-attrition frontline operations in Southeast Asia. Works over WhatsApp, SMS and web, in Bahasa Indonesia, English and Tagalog, with Arabic inherited from Lumofy.

The reader is usually on a phone, often in a second language, often mid-shift, and is deciding whether honesty carries a cost. Every design rule below follows from that.

---

## The brand in one screen

**The seal** is a Reuleaux triangle with a circular aperture. Both are curves of constant width: rolled beneath a flat plane, the plane does not rise. The product argues that a commitment should measure the same on the day it is made and the day it is checked. It is the only closed form in the Lumofy family; every sibling mark travels from one point to another, and this one returns to where it started.

**Colour.** Roughly seventy per cent neutral surface, twenty per cent Ink text, ten per cent Vega. One accent per view.

| Token | Hex | Use |
|---|---|---|
| Cosmos | `#0C0C0C` | Text and dark surfaces |
| Halo | `#EFEFEF` | Page and card surfaces |
| Vega 400 | `#00BFC4` | Accent, fills, the mark |
| Vega 600 | `#017E85` | Text and links on light grounds |
| Ink 500 | `#6B6B68` | Secondary text, the lightest permitted body text at 5.35:1 |
| Ink 150 | `#D8D8D4` | The only rule weight in the product |

Vega 400 measures 2.27:1 against white and is never body text. Cosmos on Vega 400 measures 8.62:1, so the correct pattern is dark text on a Vega fill. Reversing it is the most likely accessibility failure in this brand.

**Type.** Source Sans 3 for headings, in 600 and 400. IBM Plex Sans for all body and interface text, in 400, 500 and 600. IBM Plex Mono for every number, with tabular figures on. A monospace numeral reads as instrumentation.

**Voice.** Sentence case everywhere, including buttons. Numbers before adjectives. Name the person and the date. Say what cannot be done.

| Approved | Rejected |
|---|---|
| Assigned to Dewi, due 14 March | Action item successfully created |
| 41% responded (n=612) | Great engagement |
| We cannot change pay bands this quarter. The budget is set until July. | We are looking into it |
| Closed 12 days late. Evidence attached. | Completed |
| Could not send. Check the number. | Oops, something went wrong |

One check: if a competitor could publish the sentence unchanged, it carries no information.

**No emoji anywhere in the product, and no exclamation marks in system copy.** This README follows the same rules, because the guidelines say there is no separate marketing voice.

The full reasoning, the measured contrast ratios, the construction geometry and the Arabic rules are in [`brand/Actio-Brand-Guidelines-v1.1.pdf`](./brand/Actio-Brand-Guidelines-v1.1.pdf). The machine-readable version is [`BRAND.md`](./BRAND.md).

---

## Repository structure

```
actio/
├── README.md                              (you are here)
├── BRAND.md                               (the same rules, written for agents)
├── LICENSE                                (proprietary, with third-party mark terms)
└── brand/
    ├── README.md                          (what is in this folder and what is missing)
    ├── Actio-Brand-Guidelines-v1.1.pdf    (70 pages, the document for people)
    ├── assets/
    │   └── actio-og-cosmos.svg            (open graph card, 1200 × 630)
    └── logo/
        ├── README.md                      (pick a file, colourways, constraints)
        ├── seal-{vega,cosmos,white,halo}.svg
        ├── actio-horizontal-vega-on-{light,dark}.svg
        ├── actio-tagline-horizontal-vega-on-light.svg
        ├── actio-bilingual-vega-on-light.svg
        └── actio-horizontal-clearspace.svg
```

Product code has not started. When it does, it lands beside `brand/` rather than inside it.

---

## Using the marks

Full detail in [`brand/logo/README.md`](./brand/logo/README.md). The short version:

- **Clear space** on every side is one aperture diameter, which is 30 units at the 100-unit mark scale. Derive it from the mark, never type a pixel value.
- **Minimum size** is 16px or 6mm for the seal, 84px or 24mm for the horizontal lockup. Below 24px ship a raster, because the aperture fills in on low-density screens.
- **Never place white on Vega.** It measures 2.27:1 and fails. Cosmos on Vega is the approved pairing.
- **Never redraw the mark.** The arcs are mathematically defined and an eyeballed version reads as wrong beside a correct one.
- **Right to left:** the seal moves to the right of the wordmark. The seal itself does not mirror, because a Reuleaux triangle is symmetrical about its vertical axis.
- Anything shipped that breaks these is a defect rather than a variation, and should be raised as one.

---

## Build order

Taken from the guidelines, in sequence.

| # | Step | State |
|---|---|---|
| 1 | Brand guidelines and mark files in the repository | Done |
| 2 | `BRAND.md` versioned alongside the PDF | Done |
| 3 | One tokens file emitting CSS custom properties, Tailwind config and native resources | Next |
| 4 | Fonts self-hosted as WOFF2, subset to Latin, Latin Extended and Arabic | Next |
| 5 | Contrast check running in continuous integration | Next |
| 6 | Components: button, input, select, status pill, card, table row, empty state, toast, modal, navigation shell | Not started |
| 7 | Channels: WhatsApp templates submitted as utility, employee update, manager assignment email, SMS fallback under 160 characters | Not started |
| 8 | Dark mode verified on every screen, all four language settings proofed by a native speaker on a physical device | Not started |

The guidelines and `BRAND.md` are versioned together. A change to one without the other is a defect.

---

## Open items

Listed rather than buried, which is the point of the brand.

| Item | Status |
|---|---|
| **Trademark** | Class 42 clearance is incomplete. A United States company operates as Actio Software Corporation in an adjacent enterprise category. The Lumofy house mark keeps the two distinct, so Actio is never presented alone in a commercial context. |
| **Arabic** | Weight matching against the existing Lumofy Arabic marks is unverified. Confirm before the interface diverges from them. |
| **Tints** | Vega 50 to 200 are proposed and untested in production. |
| **Channel** | WhatsApp template categorisation is decided by the platform, not by us, and it moves unit economics directly. Submit as utility, not marketing. |

---

## Licence and trademark

The contents of this repository are proprietary. See [LICENSE](./LICENSE).

The word Actio within the Lumofy lockup, the seal, the Arabic form, and the phrase *Feedback that closes* are owned marks.

Third parties may use the horizontal lockup unmodified, with correct clear space, to state that their product integrates with Lumofy Actio. Third parties may not use the seal alone, incorporate the name into their own product name or domain, modify the marks, or apply either to merchandise.

Nothing here constitutes legal advice.

<div align="center">
<br>
<img src="./brand/logo/seal-vega.svg" alt="" width="28">
<br><br>
<sub><b>Actio</b>, a product of <a href="https://lumofy.com">Lumofy</a>. Built by <a href="https://www.shehabberam.com/">Shehab Beram</a>.</sub>
</div>
