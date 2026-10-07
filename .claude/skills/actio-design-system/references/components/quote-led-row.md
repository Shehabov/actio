# Quote-led row

The single source for this component. Moved verbatim from `actio-design-system/SKILL.md` on
2026-10-07; the restatements that were in `actio-ux-audit` and `ux-auditor.md` now point here,
and where they had drifted this text won. Read it whenever a surface uses the component: the
designer specifies all seven headings from it, with the values for that surface, and the
auditor proves it with the Audit block at the end. Sections it names (Smoothness, the chart
rules, Dark mode, the inversion rule) are in the core skill or a reference its References
table names.

The form for showing verbatim employee feedback, and the strongest pattern in `ref-06`.

```
"Rosters are published under 48 hours before the shift."
Warehouse B · 3 teams · 14 Mar
─────────────────────────────────────────────────────
"No path past senior agent."
Contact centre · 14 Mar
```

**Dimensions**

| Part | Spec |
|---|---|
| Padding | 16 block, 0 inline. The quote starts at the container edge. |
| Quote to meta | 4 |
| Row height | 72px for a one-line quote (24 + 24 + 24), growing with the quote. Already clears the 48px target where the row is interactive. |
| Separator | Ink 150 hairline between rows, never above the first or below the last. No card, no avatar, no icon. |

**Type**

| Part | Spec |
|---|---|
| Quote | Body 15/24, Ink 900, in quotation marks. The verbatim line is the primary element. Maximum four lines, then truncated at the end, never mid-word, with the full text on the detail view. |
| Meta | Small 13/20, Ink 500. Site, cohort, date, separated by a middle dot. |
| Identifier | Plex Mono 12px at the inline-end of the meta line, on interactive rows only. |
| Attribution | **Never a name.** Free text is returned reworded with names removed, so the meta line carries site and cohort, never a person. |

**States**

| State | Treatment |
|---|---|
| Static | Quote and meta, no affordance. Nothing about the row suggests it opens. |
| Interactive | The whole row is one target and carries its issue identifier. **One list picks one and holds it for every row**, so a reader never has to test which rows open. |
| Hover, interactive only | The raised surface tint across the row at 8px radius. The hairline is unchanged. Pointer only. |
| Focus, interactive only | The `focus-ring` token at `focus-offset` on the row's 8px shape. |
| Long quote | Four lines, then an ellipsis at the end. The meta line is never dropped to make room. |
| Empty | No rows. The panel renders an invitation naming the next check-in date, never "no feedback yet". |
| Loading | Three rows of reserved 72px height with their hairlines in place and nothing inside them. No shimmer. |
| Below threshold | The list is not rendered. The panel states the suppression rule and its threshold, and never the number of rows withheld. |

**Keyboard**

An interactive row is a single focusable element, reached by Tab in reading order, opened by
Enter. There is no second control inside a row: a second target inside a row is what makes a
list impossible to operate one-handed. Static rows are not focusable and carry no role.

**At 360px**

Structure unchanged. The quote keeps Body 15/24, because it is the one line the reader came
to read and it is never shrunk to fit. The meta line **wraps to a second line rather than
truncating**, and its middle dots wrap with it. Inline padding stays 0, so the quote starts
at the 16px page margin and nothing indents it further.

**Dark mode**

Quote Halo `#EFEFEF`, meta the secondary `#A8A8A4`. The separator moves from Ink 150 to the
row rule `#1C1C1A`. Hover takes `#232320`. No shadow in either theme.

**RTL**

The quote sets right to left and takes Arabic quotation marks. Latin runs inside it, a site
name or a system word, stay LTR inside `dir="ltr"` with `unicode-bidi: isolate`. The meta
line mirrors and its middle dots mirror with it; the date stays LTR. The identifier moves to
the inline-end and renders on the left, still LTR. Arabic sets one to two points larger with
line height increased 15 to 20%, so a one-line row grows past 72px. Nothing is clipped to
hold the height.

## Audit

The component-specific proofs. The checks every component shares (all seven headings present,
dark mode by token, RTL stated) and the severities are in `actio-ux-audit` §7. On a spec, read
each row off the named heading; on built UI, use the method given.

| Failure | How you prove it |
|---|---|
| A quote-led row carrying a name, an initial, an avatar, a handle or an employee identifier, or a card or an icon around the quote | Read the meta line and the row chrome. **A blocker**, because it breaks the privacy promise rather than a style rule |
| One list mixing interactive and static rows, or an interactive row with a second focusable child | Spec: the States and Keyboard headings. Built UI: Tab through the list and save the trace |
| A truncated meta line or a shrunk quote at 360px | Spec: the 360px heading. Built UI: capture at 360px with the longest locale |
| The Ink 150 hairline surviving into dark mode | Read the dark tokens off the spec. The separator is the `#1C1C1A` row rule in dark |
| A date or an identifier that lost its LTR isolation, or a row clipped to hold its height in Arabic | Spec: the RTL heading. Built UI: render under `dir="rtl"` with an Arabic quote |
| Below threshold, the list rendered, or the number of rows withheld stated | Spec: the States table. The manager reading this panel must not be able to infer the cohort size |

Open item for Shehab, not a finding (recorded 2026-10-07): the 16 block padding under
Dimensions and the `24 + 24 + 24` derivation of the 72px height do not compose to the same row
once the meta line is counted (16 + 24 + 4 + 20 + 16 = 80). Until it is settled, a spec using
this row states which derivation it takes, and the auditor files neither as a finding.

Pre-flight line: hairline separated, no card, no avatar, no name. One list is either all
interactive or all static. The meta wraps at 360px rather than truncating.
