# Actio logo kit

Every SVG has an outlined wordmark, so no font installation is required. The seal geometry in every file is the same set of mathematically defined arcs. Do not redraw it.

The full kit described at the bottom of this page has not been exported yet. What is in this folder is the working set: the seal in four colourways, the horizontal lockup on both grounds, the tagline and bilingual lockups, and the clear-space overlay to send to third parties.

---

## Pick a file

| Situation | File |
|---|---|
| Light background, standard use | `actio-horizontal-vega-on-light.svg` |
| Dark background | `actio-horizontal-vega-on-dark.svg` |
| Mark only | `seal-vega.svg` |
| One colour, dark print | `seal-cosmos.svg` |
| One colour, reversed out | `seal-white.svg` |
| Low emphasis, watermarks | `seal-halo.svg` |
| With the tagline | `actio-tagline-horizontal-vega-on-light.svg` |
| Both scripts together, for signage and certificates | `actio-bilingual-vega-on-light.svg` |
| Handing the mark to a third party | `actio-horizontal-clearspace.svg` |
| Link preview card | `../assets/actio-og-cosmos.svg` |

---

## Colourways

| Name | Mark | Wordmark | Use |
|---|---|---|---|
| `vega-on-light` | Vega | Cosmos | The default |
| `vega-on-dark` | Vega | Halo | Cosmos and photographic grounds |
| `all-vega` | Vega | Vega | Single colour on Cosmos or Halo |
| `cosmos` | Cosmos | Cosmos | One-colour dark printing |
| `white` | White | White | One-colour reversed |
| `halo` | Halo | Halo | Low emphasis, watermarks |

---

## Constraints

**Clear space** on every side is one aperture diameter, which is 30 units at the 100-unit mark scale. `actio-horizontal-clearspace.svg` shows this and is the file to send when a third party asks how to place the mark.

**Minimum sizes** are 16px or 6mm for the seal, and 84px or 24mm for the horizontal lockup. Below 24px use a raster rather than scaling the vector, because the aperture fills in on low-density screens.

**Approved grounds** are white, Halo, Ink 50, Cosmos and Vega 400. No other colour, including Lumofy sibling accents.

**Never place white on Vega.** It measures 2.27:1 and fails. Cosmos on Vega measures 8.62:1 and is the approved pairing.

**Never** rotate, stretch, outline, recolour outside the list above, add a gradient or a shadow, fill the aperture, enclose the mark in a container shape, or redraw it. The arcs are mathematically defined and an eyeballed version will read as wrong beside a correct one.

**Right to left.** The seal moves to the right of the wordmark. The seal itself does not mirror, because a Reuleaux triangle is symmetrical about its vertical axis.

**Animation.** One reveal exists: the aperture scales from 0.9 to 1 over 200ms on `cubic-bezier(.2, 0, .2, 1)`. The mark is never used as a loading spinner and never loops. Serve the static file where reduced motion is requested.

**Third parties** may use the horizontal lockup unmodified, with correct clear space, to state that their product integrates with Lumofy Actio. They may not use the seal alone, incorporate the name into their own, or apply either to merchandise.

Anything shipped that breaks this page is a defect rather than a variation, and should be raised as one.

---

## What is here

```
logo/
  seal-vega.svg                                  the mark, 100 × 100
  seal-cosmos.svg
  seal-white.svg
  seal-halo.svg
  actio-horizontal-vega-on-light.svg             the primary lockup, 303.7 × 100
  actio-horizontal-vega-on-dark.svg
  actio-tagline-horizontal-vega-on-light.svg     lockup with "Feedback that closes."
  actio-bilingual-vega-on-light.svg              Latin and Arabic, signage only
  actio-horizontal-clearspace.svg                exclusion zone overlay
```

## What is not here yet

The exports below are named in the guidelines and are still to be produced. Filenames are reserved so that references written now do not have to change.

```
svg/
  vertical/     actio-vertical-{six colourways}.svg
  wordmark/     actio-wordmark-{six}.svg · actio-wordmark-arabic-{six}.svg
  tagline/      actio-tagline-stacked-{six}.svg
  descriptor/   actio-descriptor-horizontal-{six}.svg
  arabic/       actio-arabic-{horizontal,vertical}-{four}.svg
  parent/       lumofy-actio-{horizontal,vertical}-{four/six}.svg
  mark/         seal-currentcolor.svg (inherits `color`) · favicon.svg
  animated/     the approved reveal, Vega and white
  sticker/      seal with a white keyline for coloured surfaces
png/            transparent, 16 to 1600px, mirroring the svg structure
app-icon/       ios · rounded 16 to 1024 · round · inverse · maskable · favicons
social/         avatars at 400 and 1024 · open graph cards, dark and light
email/          signature lockups at 240px and a 48px seal
print/          vector PDF: colour, black, reversed, vertical, Arabic, parent
```

The sticker file prints the aperture in white rather than cutting it out, because a physical hole is impractical at this size. It is the only approved departure from the knockout.

---

## Regenerating

The kit is generated from geometry rather than drawn, so a change to the mark is made in the generator and re-exported rather than edited in a vector application. Source geometry, colour values and the complete rule set are in [`../../BRAND.md`](../../BRAND.md), and the reasoning is in [`../Actio-Brand-Guidelines-v1.1.pdf`](../Actio-Brand-Guidelines-v1.1.pdf).

| Property | Value |
|---|---|
| Grid | 100 × 100 units |
| Circumradius | 33 |
| Vertices | −90°, 30°, 150° on the circumcircle |
| Side and arc radius | 57.158 |
| Arc centres | Each arc centred on the opposite vertex |
| Optical centre | 50, 54.4 |
| Aperture | r15 at 50, 53.4 |
| Thinnest wall | 13.6 units |
| Fill rule | `evenodd` |
| Gradient | None |
