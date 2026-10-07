# App shell anatomy

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. Read it when the surface
includes any shell region: sidebar, navigation, count badges, top bar, canvas, or the org and
account switchers. The shell's translation to 360px is in the core skill (Responsive) and in `responsive.md`.

```
┌──────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR     │  TOP BAR                                             │
│  264px       │  title · subtitle · search · actions · one primary   │
│              ├──────────────────────────────────────────────────────┤
│  org switch  │  CANVAS                                              │
│  ─────────   │  max 1200px for data, 720px for reading              │
│  primary CTA │  64px side margin desktop, 16px mobile               │
│              │                                                      │
│  QUEUE       │  ┌─ metric tiles ───────────────────────────────┐    │
│  · Queue  12 │  │ two tiles, one inverted                      │    │
│  · Cycles    │  └──────────────────────────────────────────────┘    │
│  · People    │                                                      │
│  CLOSURE     │  ┌─ primary card ────────┐ ┌─ secondary card ──┐    │
│  · Evidence  │  │                       │ │                   │    │
│  · Settings  │  └───────────────────────┘ └───────────────────┘    │
│              │                                                      │
│  ─────────   │                                                      │
│  Lumofy ▾    │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

| Region | Rules |
|---|---|
| Sidebar | 264px fixed. **The same ground as the canvas, separated by an Ink 150 hairline on the inline-end edge and nothing else.** Never a tinted panel: that one change is what turns this screen into a dashboard (`ref-06`). Collapses to an icon rail at 1024px, to a bottom bar at 768px. |
| Section labels | Plex Mono 12px 400, 0.02em tracking, Ink 500, uppercase. All-caps is permitted only in a Plex Mono 12px label at 0.02em (`BRAND.md` §3), here and on the metric tile. **48px of space above each group**, which is what makes the sidebar read as `ref-06` rather than as a menu. |
| Nav item | **64px tall**, 8px radius, Plex Sans 15/24 weight 400. **Label at the inline-start, icon 16px at the inline-end, pushed to the far edge** (`ref-06`). Active takes **the raised surface tint with an Ink 900 label at weight 400**: white on the Ink 50 sidebar, `#1A1A18` in dark. **Never a Vega fill of any step**, and never a heavier weight. This is the same move as the active pill tab and the selected palette row, so all three selection states in the product behave identically and none of them spends the accent budget. |
| Identity mark | Where a nav row stands for a site, a cycle or a lane, a **16px rounded square at a 4px radius** at the inline-start, in that lane's colour (`ref-06`). The radius is a declared departure, in the departures table. Never an 8px dot, which belongs to the command palette, and never a photo or an avatar. |
| Count badge | Plex Mono 12px tabular, inline-end aligned. Overdue counts take the overdue status colour; everything else is Ink 500. |
| Top bar | 64px. Title H2, subtitle Small in Ink 500 on one line beneath. Actions inline-end. **Exactly one primary.** It scrolls with the canvas below 1024px and sticks at 1024px and above. In both states it sits on the canvas ground and separates with an Ink 150 hairline on its block-end edge and nothing else: **it never gains a shadow, a tint step or a border on scroll.** |
| Canvas | Ink 50 ground. Data width 1200px, reading width 720px. Margins 64 / 32 / 16 by breakpoint. |
| Account area | Sidebar foot. Lumofy wordmark and product switcher. Sirius is permitted in the parent wordmark and the account switcher and nowhere else in the interface (§1.1). |
