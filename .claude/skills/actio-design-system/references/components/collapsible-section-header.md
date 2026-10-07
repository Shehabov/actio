# Collapsible section header

The single source for this component. Moved verbatim from `actio-design-system/SKILL.md` on
2026-10-07; the restatements that were in `actio-ux-audit` and `ux-auditor.md` now point here,
and where they had drifted this text won. Read it whenever a surface uses the component: the
designer specifies all seven headings from it, with the values for that surface, and the
auditor proves it with the Audit block at the end. Sections it names (Smoothness, the chart
rules, Dark mode, the inversion rule) are in the core skill or a reference its References
table names.

For a long page that the reader works down. `ref-06` uses it for Statistics and Feedback.

**Dimensions**

| Part | Spec |
|---|---|
| Header row | 48px tall, the full content width, so the whole row is the target on touch as well as under a pointer |
| Inline padding | 0, so the title aligns with the content beneath it. The hover and focus shape takes an 8px radius and 8px of inline padding, bleeding outward. |
| Count | 8px after the title |
| Chevron | 16px, 1.5px stroke, inline-end. **Not 20px.** Icons are drawn on `BRAND.md` §6's 24px grid and rendered at a size that is on the §1.5 spacing scale, so 16 or 24. 20 is on neither. |
| Gap to the body | 16 when open |
| Gap to the next header | 24 when closed |
| Rule | None. The header sits on space. |

**Type**

Title H3. Count Plex Mono 12px, tabular, and only when the number is actionable: an overdue
count qualifies, a total does not. Chevron Ink 500 in light mode.

**States**

| State | Treatment |
|---|---|
| Open | Chevron points block-start. The body renders beneath. This is the default on first load. |
| Closed | Chevron points block-end. The body is **removed from the document**, not hidden with opacity, so its focusable elements leave the tab order with it. |
| Toggling | The chevron rotates 180deg over `motion-micro`, 120ms on the standard curve. Nothing else moves. |
| Hover | The chevron moves from Ink 500 to Ink 900. No ground, no rule. Pointer only. |
| Focus | The `focus-ring` token at `focus-offset` on the header row's 8px shape. |
| Empty section | Renders open with the section's empty state inside it. A section that cannot be opened tells the reader nothing about what is in it. |
| Persistence | Per device, not per account. A worker may use a shared handset. |

There is no disabled state. A section is either present with content, present with an empty
state, or not rendered.

**Keyboard**

- The header is a `button` carrying `aria-expanded` and `aria-controls` pointing at the body.
- Enter and Space toggle it. Nothing else binds.
- Focus stays on the header through the toggle, so a reader collapsing three sections in a
  row never loses their place.
- When closed, nothing inside the body is reachable by Tab, because the body is removed
  rather than hidden.

**At 360px**

Unchanged in structure. The row is already full width at 48px, which is the touch target.
Where the title and count together exceed the width, **the title truncates at the end and
the count keeps its space**, because the count is the actionable half. The default stays
open: a collapsed section at 360px hides more work than it does on a desk, not less.

**Dark mode**

Title Halo `#EFEFEF`. Count and chevron the secondary `#A8A8A4`, with hover moving the
chevron to Halo. No rule and no ground appear, in either theme.

**RTL**

The title moves to the inline-start and renders on the right. The chevron moves to the
inline-end and renders on the left. The 180deg rotation runs in the block axis and does not
mirror. The count follows the title and stays LTR inside `dir="ltr"` with
`unicode-bidi: isolate`.

## Audit

The component-specific proofs. The checks every component shares (all seven headings present,
dark mode by token, RTL stated) and the severities are in `actio-ux-audit` §7. On a spec, read
each row off the named heading; on built UI, use the method given.

| Failure | How you prove it |
|---|---|
| A section defaulting to closed, or persisting its state per account rather than per device | Spec: the States heading. Built UI: load the section fresh and read where the state is stored. Per-account persistence means a worker opens a shared handset on someone else's collapsed sections |
| A closed body hidden with opacity rather than removed, so its controls stay in the tab order | Spec: the Closed state. Built UI: close it and Tab through; anything inside it reached is the finding |
| A header that is a `div` with a click handler, or focus leaving the header on toggle | Spec: the Keyboard heading names a `button` with `aria-expanded` and `aria-controls`, Enter and Space. Built UI: keyboard trace |
| A truncated count at 360px | Spec: the 360px heading. Built UI: capture at 360px with the longest-locale title. The title truncates before the count does |

Pre-flight line: open by default, state per device. The body is removed when closed, not
hidden. Title truncates before the count does.
