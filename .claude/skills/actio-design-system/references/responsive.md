# Responsive, mobile first, and the evidence they need

Moved verbatim from `actio-design-system/SKILL.md` on 2026-10-07. The core skill holds the
widths and the ten rules compressed; read this when a spec states a layout at a width, when
translating the shell or a table to 360px, or when deciding what evidence a surface owes.
Evidence for a design spec is the layout stated at every width, and a frame board where one
helps. The full screenshot set below is the evidence for built UI (CLAUDE.md rule 9).

## Responsive is not a feature. It is the definition of done.

**Every surface Actio ships works on every device, every screen size and every breakpoint.**
Phone, tablet, laptop, desktop, and every width between them. A surface that works at three
widths and breaks at the fourth is not finished, and "we will do tablet later" is not a
scope decision, it is a defect with a date on it.

This is not a preference. Actio's reader is a frontline worker on a cheap handset, a team
lead on a tablet in a warehouse office, an operations manager on a laptop, and a site
director on a large monitor. All four are real, all four are in the same product, and none
of them is the edge case.

### The widths every surface is verified at

| Width | Represents | Must |
|---|---|---|
| 320px | The smallest phone still in use on a frontline | Work. Not degrade gracefully. Work. |
| 360px | The design baseline, the majority session | Be the width the surface was designed at |
| 390 to 430px | Modern phones | Inherit from 360 without a separate layout |
| 768px | Tablet portrait, the warehouse office | A real layout, not a stretched phone |
| 1024px | Tablet landscape, small laptop | The sidebar becomes an icon rail |
| 1280px | Laptop | The full shell |
| 1440px and above | Desktop and large monitors | Content capped at the data width, never full-bleed text |

Breakpoints are `BRAND.md` §1.5: 480, 768, 1024, 1440. Reading width 720px, data width
1200px.

### Rules

1. **Design at 360px first.** Every larger layout inherits from it. A desktop layout
   squeezed down is visible as a squeeze and is a finding.
2. **No horizontal scroll at any width**, ever, on the page body. A table, a diagram or a
   code block may scroll inside its own container. Nothing else may.
3. **Test between the breakpoints, not only at them.** Layouts break at 1023px and 769px far
   more often than at the round numbers. Drag the viewport.
4. **Touch targets are 48 by 48 minimum at every width**, including on a desktop with a
   touchscreen, because a laptop with touch is a tablet held differently.
5. **Both orientations.** Portrait and landscape, on phone and tablet. A landscape phone is
   a 360px-tall viewport and most vertical layouts have never been opened at one.
6. **200% browser zoom counts as a width.** At 200% a 1280px window is a 640px layout. It
   must work, not merely not crash.
7. **Nothing is hidden to make it fit.** If a control does not fit, the layout is wrong.
   Moving it, stacking it or moving it into a detail view is a design decision; deleting it
   at a breakpoint is data loss.
8. **The longest locale at the narrowest width** is the real test. Tagalog at 320px, not
   English at 360px.
9. **RTL at every width.** A layout that mirrors at desktop and breaks at 360px has not
   been tested.
10. **No device sniffing.** Respond to the viewport and to capability, never to a user agent
    string. A user agent is a guess and it is wrong on the devices this product runs on.

### Evidence

A surface is not done until a screenshot exists at 320, 360, 768, 1024 and 1440, in both
themes, in English and Arabic, and in the longest locale, plus one at 200% zoom and one in
landscape. Screenshots are taken with Playwright via `npx playwright` (`npx playwright
install chromium` once). That is the evidence `ux-auditor` checks and `qc-engineer`
reproduces. A spec with three screenshots covering three widths has covered three widths.

## Mobile first, which the references are not

Every reference is desktop-led, and only `ref-07` carries a phone view at all. Actio's
majority session is a low-cost Android handset, mid-shift, one-handed. **Design the 360px
view first and let desktop inherit from it.**

| Desktop pattern | At 360px |
|---|---|
| 264px sidebar | Bottom bar, five destinations, labels always shown, never icons alone |
| Two metric tiles, three at most | One column, inverted tile first, the second below |
| Two-column card grid | One column, primary card first |
| Table with 6 columns | Rows, not a horizontal scroll. The two columns that matter, the rest on the detail view. |
| Top bar with 5 actions | Title and one primary. The rest move into the view. |
| Search with a shortcut chip | Search icon only. There is no keyboard. |

Touch targets 48 by 48 minimum, including inside tables. The zero-to-ten scale is the
most-tapped control in the product and is used one-handed, so it sits in the thumb zone.
