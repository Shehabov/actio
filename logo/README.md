# Actio logo kit

Every SVG has an outlined wordmark, so no font installation is required. Every PNG has a transparent background except the social avatars and open graph cards, where the ground is part of the artwork. Print files are supplied as vector PDF.

---

## Pick a file

| Situation | File |
|---|---|
| Light background, standard use | `svg/horizontal/actio-horizontal-vega-on-light.svg` |
| Dark background | `svg/horizontal/actio-horizontal-vega-on-dark.svg` |
| Square space | `svg/vertical/actio-vertical-vega-on-light.svg` |
| One colour, dark print | `svg/horizontal/actio-horizontal-cosmos.svg` |
| One colour, reversed out | `svg/horizontal/actio-horizontal-white.svg` |
| Entirely in brand colour | `svg/horizontal/actio-horizontal-all-vega.svg` |
| Mark only | `svg/mark/seal-vega.svg` |
| Inside a React or Vue component | `svg/mark/seal-currentcolor.svg` (inherits `color`) |
| Wordmark without the mark | `svg/wordmark/actio-wordmark-cosmos.svg` |
| With the tagline | `svg/tagline/actio-tagline-horizontal-vega-on-light.svg` |
| With the parent descriptor | `svg/descriptor/actio-descriptor-horizontal-vega-on-light.svg` |
| Arabic, right to left | `svg/arabic/actio-arabic-horizontal-vega-on-light.svg` |
| Both scripts together | `svg/bilingual/actio-bilingual-vega-on-light.svg` |
| Contracts, first commercial use | `svg/parent/lumofy-actio-horizontal-vega-on-light.svg` |
| iOS app | `app-icon/icon-ios-1024.png` |
| Android adaptive | `app-icon/icon-maskable-512.svg` |
| Web manifest | `app-icon/icon-rounded-{512,192}.png` |
| Favicon | `svg/mark/favicon.svg`, or `app-icon/favicon-{16,32,48}.png` |
| Email signature | `email/signature-vega-on-light-240w.png` |
| Social avatar | `social/avatar-cosmos-1024.png` |
| Link preview card | `social/og-image-1200x630.png` |
| Sending to a printer | `print/*.pdf` |
| Handing the mark to a third party | `svg/guides/actio-horizontal-clearspace.svg` |
| Splash or first frame of a video | `svg/animated/actio-seal-reveal-vega.svg` |
| Die-cut sticker on a coloured surface | `svg/sticker/seal-sticker.svg` |

---

## Colourways

| Name | Mark | Wordmark | Use |
|---|---|---|---|
| `vega-on-light` | Vega | Cosmos | The default |
| `vega-on-dark` | Vega | White | Cosmos and photographic grounds |
| `all-vega` | Vega | Vega | Single colour on Cosmos or Halo |
| `cosmos` | Cosmos | Cosmos | One-colour dark printing |
| `white` | White | White | One-colour reversed |
| `halo` | Halo | Halo | Low emphasis, watermarks |

---

## Structure

```
svg/
  mark/         seal-{vega,cosmos,white,halo,currentcolor}.svg · favicon.svg
  horizontal/   actio-horizontal-{six colourways}.svg
  vertical/     actio-vertical-{six colourways}.svg
  wordmark/     actio-wordmark-{six}.svg · actio-wordmark-arabic-{six}.svg
  tagline/      actio-tagline-{horizontal,stacked}-{six}.svg
  descriptor/   actio-descriptor-horizontal-{six}.svg
  arabic/       actio-arabic-{horizontal,vertical}-{four}.svg
  bilingual/    actio-bilingual-{six}.svg
  parent/       lumofy-actio-{horizontal,vertical}-{four/six}.svg
  guides/       clear-space overlays for third parties
  animated/     the approved reveal, Vega and white
  sticker/      seal with a white keyline for coloured surfaces
png/            transparent, 16-1600px, mirroring the svg structure
app-icon/       ios · rounded 16 to 1024 · round · inverse · maskable · favicons
social/         avatars at 400 and 1024 · open graph cards, dark and light
email/          signature lockups at 240px and a 48px seal
print/          vector PDF: colour, black, reversed, vertical, Arabic, parent
```

---

## Constraints

**Clear space** on every side is one aperture diameter, which is 30 units at the 100-unit mark scale. The overlay in `svg/guides/` shows this and is the file to send when a third party asks how to place the mark.

**Minimum sizes** are 16px or 6mm for the seal, and 84px or 24mm for the horizontal lockup. Below 24px use the supplied raster rather than scaling the vector, because the aperture fills in on low-density screens.

**Never** rotate, stretch, outline, recolour outside the list above, add a gradient or a shadow, fill the aperture, enclose the mark in a container shape, or redraw it. The arcs are mathematically defined and an eyeballed version will read as wrong beside a correct one.

**Never place white on Vega.** It measures 2.27:1 and fails. Cosmos on Vega measures 8.62:1 and is the approved pairing.

**Right to left.** The seal moves to the right of the wordmark. The seal itself does not mirror, because a Reuleaux triangle is symmetrical about its vertical axis.

**Animation.** One reveal exists: the aperture scales from 0.9 to 1 over 200ms. The mark is never used as a loading spinner and never loops. Serve the static file where reduced motion is requested.

**The sticker file** prints the aperture in white rather than cutting it out, because a physical hole is impractical at this size. It is the only approved departure from the knockout.

---

## Regenerating

The kit is generated from geometry rather than drawn, so a change to the mark is made in the generator and re-exported rather than edited in a vector application. Source geometry, colour values and the complete rule set are in `../BRAND.md`.
