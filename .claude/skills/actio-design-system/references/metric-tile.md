# Metric tile

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when the surface
carries a metric tile, a featured figure or an inverted feature surface. The inversion rule
itself is in the core skill.

The workhorse of the product. `ref-02` renders it as a row of six small bare readings;
`ref-06` renders **two, very large, on a panel of their own**. Actio takes `ref-06`.
A row of six is the clearest tell of a generic dashboard, and Actio does not have six
measures worth that much of a screen.

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ RESPONDED                   │        │ DAYS OVERDUE                │  ← inverted
│                             │        │                             │
│ 41%                         │        │ 12                          │
│ n=612                       │        │ Warehouse B                 │
│ ↗ +4pp                      │        │ ↘ -3 since March            │
└─────────────────────────────┘        └─────────────────────────────┘
```

| Part | Spec |
|---|---|
| Label | Plex Mono 12px 400, 0.02em, Ink 500, uppercase |
| Icon | **None.** A metric tile carries a label, a figure, a sub-label and a delta, and nothing else. A decorative icon in the corner of a card is the most common KPI-tile tell in the category, the anti-generic checklist counts it as a finding, and Smoothness §3 says delete it. |
| Figure | Plex Mono 500, tabular. Display 40/46 on the inverted tile, because that is the featured figure of the view (Smoothness §2). The metric token 28/32 on the neutral tiles. Ink 900, or Vega 200 on the inverted tile. |
| Sub-label | Plex Sans 400 13/20, Ink 500. **A percentage always carries `n=` here.** |
| Delta | Plex Mono 12px with an arrow glyph. Written as `+4pp` or `-4pp`, never `+4%`. |
| Delta colour | Improvement uses the closed status colour, deterioration uses overdue. Both carry the arrow, so colour is never the sole carrier. |
| Ground | A panel one lightness step up from the page: white `#FFFFFF` in light mode, card `#1A1A18` in dark, which is the panel tint step this system already uses everywhere. **No border and no shadow**: it lifts by lightness, as every surface here does. 12px radius per `BRAND.md` §1.5, which is tighter than the reference and is a spec constraint, not a choice. The structure comes from `ref-06`; **the values never do**. |
| Padding | **48**, 32 at tablet, 24 on mobile. This is double a normal card and it is deliberate. |
| Row | **Two across on desktop. Three is the absolute ceiling and needs a reason written in the spec. Four or more is a finding.** 2 up tablet, 1 up mobile with the inverted one first. |
| Proportion | The figure is at least 2.5× its own label. Against this tile's 12px Plex Mono label, Display 40 is 3.3 to 1 and clears it; the metric token 28 is 2.3 to 1 and does not. So a neutral tile that has to carry the view takes Display. |
