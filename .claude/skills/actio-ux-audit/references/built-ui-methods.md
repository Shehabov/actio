# Built-UI audit methods

Moved verbatim from `.claude/agents/ux-auditor.md` (Pass D) and `actio-ux-audit` (the responsive
pass) on 2026-10-07. Read it in built-UI mode: implemented markup, a preview build or a shipped
surface, and also whenever the designer has written a frame board you can render. At the design
gate on a spec alone, the checks that need rendered UI are recorded `n/a` with the reason
(R-18), never failed for being absent. Evidence lands under
`.actio/runs/<run-id>/evidence/ux-auditor/`: contrast output, Playwright screenshots at every
width and at 200%, desaturated frames, keyboard traces, on-load motion recordings, gap
measurements, per-component 360px captures, RTL renders and the `ref-04` paired frame.

**Pass D, measured accessibility and frontline reality.**

| Check | Method | Fail condition |
|---|---|---|
| Contrast | Compute the WCAG ratio from the two `BRAND.md` hex values in a node script, and save the script and its output to the evidence directory. Dark mode pairs take their hex values from `Actio-Brand-Guidelines-v1.pdf`, as `actio-design-system` directs | Below 4.5:1 body, 3:1 large text or non-text, or any pair not in the `BRAND.md` table and not measured |
| Focus | Keyboard through every interactive element | Invisible ring, ring clipped by overflow, order that jumps, a trap, a skipped control |
| Targets | Measure the hit area in CSS pixels | Below 48x48, or adjacent targets closer than the spacing scale allows |
| Labels | Read the DOM, not the screenshot | Placeholder used as the label, label that disappears on input, icon-only control with no accessible name |
| Colour alone | Desaturate the screenshot: `filter: grayscale(1)` on the root before the Playwright capture | A state, error or lane distinguishable only by hue |
| Zoom | 200% at 360px width, captured with Playwright | Clipping, overlap, horizontal scroll on body, a control pushed off screen |
| Reduced motion | Emulate the preference in Playwright with `reducedMotion: 'reduce'` | Any animation still running |
| Low-cost Android | Throttled CPU and a slow connection, set in Playwright on Chromium through a DevTools protocol session | Layout shift after load, a blocked font request that leaves text unreadable, a tap that gives no feedback inside 120ms |
| Glare and one hand | Measure the distance from the 360px one-handed thumb arc to every primary control, and list every element whose only signal is a hairline, a 12px size or a weight difference | Primary action outside thumb reach at 360px, hairline-only affordance as the sole signal, 12px text carrying required meaning |
| Localisation | Pseudo-locale at plus 20%, and Arabic mirrored | Truncation, wrap into an unreadable shape, a button that only fits English, a concatenated count string, a physical-direction layout that does not mirror |

Frontline baseline for every visual check: 360px wide, one hand, second language, mid-shift,
intermittent connection, possibly a shared handset. A layout that only works at 1440px on a desk
has failed, and you say so in those words.

## Responsive, audited at every width

Not a section of the accessibility pass. Its own pass, run on every surface.

- [ ] 320px works. Not degrades, works. It is the smallest phone still on a frontline.
- [ ] 360px is the width the surface was designed at, and larger layouts inherit from it
- [ ] 768px is a real tablet layout, not a stretched phone
- [ ] 1024px collapses the sidebar to an icon rail
- [ ] 1440px and above caps content at the data width, never full-bleed text
- [ ] **Tested between the breakpoints**, not only at them. Layouts break at 1023 and 769
      far more often than at the round numbers.
- [ ] No horizontal scroll on the page body at any width. A table, diagram or code block
      may scroll inside its own container. Nothing else may.
- [ ] Touch targets 48 by 48 at every width, including desktop with a touchscreen
- [ ] Both orientations on phone and tablet. A landscape phone is a 360px-tall viewport.
- [ ] 200% zoom treated as a width: at 200% a 1280px window is a 640px layout
- [ ] Nothing hidden to make it fit. Moved, stacked or sent to a detail view is a decision;
      deleted at a breakpoint is data loss.
- [ ] The longest locale at the narrowest width: Tagalog at 320px, not English at 360px
- [ ] RTL at every width, not only at desktop
- [ ] No device sniffing. Respond to viewport and capability, never to a user agent string.

**Evidence.** A Playwright screenshot, taken through `npx playwright`, at 320, 360, 768,
1024 and 1440, in both themes, in English and Arabic, in the longest locale, plus one
landscape and one at 200% zoom. A spec with three screenshots has covered three widths, and
the finding is the missing evidence rather than the missing layout.
