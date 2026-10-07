# Charts

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when the surface
carries any chart or data series. The bare sparkline has its own file under `components/`.

From `ref-02`'s bar chart, with its palette replaced.

| Concern | Rule |
|---|---|
| Series | Vega 400 primary, Ink 500 comparison, Vega 200 secondary. **No fourth colour.** |
| More than three categories | The Vega scale with neutrals, never a sibling hue. The ageing ramp in `ref-02` is exactly what not to do. |
| Sample size | Always beside a percentage. A figure that hides its base contradicts the product's argument. |
| Type | Axis labels and all figures in Plex Mono, tabular |
| Grid | Ink 150, dropping to `#242422` in dark mode |
| Banned | **Any pie, donut, ring, radial, gauge or arc, at any number of slices**, including a progress ring drawn around a figure and a completion ring on a tile. Dual axes, truncated value axes, 3D, a chart that draws itself on load. The only chart form on a metric tile is the bare sparkline. |
| Comparison | Shown even when it is unflattering |
