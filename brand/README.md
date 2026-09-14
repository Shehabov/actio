# brand/

Everything that has to exist before the first line of product code.

| Path | What it is |
|---|---|
| [`Actio-Brand-Guidelines-v1.1.pdf`](./Actio-Brand-Guidelines-v1.1.pdf) | The document for people. 70 pages, four sections: defining the brand, design elements, Arabic and language, governance. It carries the reasoning and the measured contrast ratios. |
| [`../BRAND.md`](../BRAND.md) | The same rules written for agents. Tokens, scales, component rules, copy rules, and what is banned. |
| [`logo/`](./logo/) | The mark. Seal in four colourways, horizontal lockups on both grounds, tagline and bilingual lockups, clear-space overlay. See [`logo/README.md`](./logo/README.md). |
| [`assets/`](./assets/) | Composed artwork. Currently the open graph card at 1200 × 630, Cosmos ground, lockup at the left. |

The PDF and `BRAND.md` are versioned together. A change to one without the other is a defect.

## Still to produce

Named in the guidelines under Assets, in build order.

1. A single tokens file emitting CSS custom properties, Tailwind configuration and native resources, for colour, type, spacing, radius and motion.
2. Source Sans 3, IBM Plex Sans, IBM Plex Mono and IBM Plex Sans Arabic, self-hosted as WOFF2 and subset to Latin, Latin Extended and Arabic. Never a public CDN: a blocked request means an unreadable survey.
3. App icons at 512, 192, 180, 64, 32 and 16, plus favicon, avatar and the raster open graph image.
4. A WCAG 2.2 AA contrast check running in continuous integration.
5. Print PDFs in CMYK. There is no exact Pantone match for Vega, so build to CMYK and proof.

## A note on the files in here

The three lockups supplied with the brand package carried embedded C2PA content-credential manifests, roughly 5KB of base64 each. They were stripped before committing. The geometry is untouched.
