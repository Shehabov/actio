# The UI pass: product flows, cross-cutting, every width, both languages

Read when: the change touches a screen, a string, a layout or a locale file. Skip it for a change with no user-visible surface and record the surface `n/a` with the reason (R-18).

## 4. Product flows

Run these as a user, on a phone viewport, not as API calls.

- Receive the invitation, read the privacy preview, answer, submit.
- Answer, lose connection mid-survey, reconnect, confirm nothing was lost or doubled.
- Receive an assignment as a team lead, open it, attach evidence, close it.
- Try to close without evidence and read what the product says.
- Open the queue with forty issues, sort, filter, find one.
- Open a protected row and confirm there is nothing to open.
- Read a close-the-loop message as the employee who raised the issue.

## 5. Cross-cutting

| Axis | What to run |
|---|---|
| Themes | Both. A colour that works in one mode only is not part of the system. |
| Locales | English, Bahasa Indonesia, Tagalog, Arabic. Every screen the change touches. |
| RTL | Arabic. Layout mirrors, the seal does not, numerals and charts do not. |
| Width | 360px first. Then 768 and desktop. |
| Zoom | 200%. Nothing clips, overlaps, or scrolls horizontally. |
| Keyboard | Traverse the whole flow with no mouse. Focus visible and in reading order throughout. |
| Screen reader | The survey and the queue, as flows, not as isolated components. |
| Reduced motion | Every transition honours it. |
| Offline | Answers held on device, stated plainly, sent on reconnect, not duplicated. |
| Slow connection | Throttled to a realistic 3G profile. Nothing blocks on a request that could show known-yet-stale. |
| Device | A low-cost Android handset with a small screen, not only a desktop browser at full size. **That device is the majority case.** |

---

## Responsive and bilingual, tested every run

Two rules that are not optional and are not sampled.

### Every width

A surface is tested at **320, 360, 768, 1024 and 1440**, plus one width between each pair,
because layouts break at 1023 and 769 far more often than at the round numbers. Both
orientations on phone and tablet. 200% zoom counts as a width: at 200% a 1280px window is a
640px layout.

| Check | Fail looks like |
|---|---|
| No horizontal scroll on the page body at any width | The body scrolls sideways. A table inside its own container may. |
| Touch targets 48 by 48 at every width | A control that shrinks below it on desktop with touch |
| Nothing hidden to fit | A control present at 1440 and absent at 360 with no detail view carrying it |
| Landscape phone | A 360px-tall viewport. Most vertical layouts have never been opened at one. |
| Longest locale at the narrowest width | Tagalog at 320px, not English at 360px |
| RTL at every width | Mirrors at desktop, breaks at 360 |

Evidence is a screenshot per width, per theme, in English and Arabic and in the longest
locale, plus landscape and 200% zoom. A test log claiming "responsive verified" with three
screenshots has verified three widths.

### Both languages

**Every flow is run twice, once in English and once in Arabic.** Not spot-checked, not
sampled, not "the Arabic strings exist so it is covered".

| Check | |
|---|---|
| Every string resolves in both catalogues | A missing key is a failure, never a silent fallback to English |
| RTL layout mirrors correctly | Logical properties throughout. The seal does not mirror; the lockup order does. |
| Numerals, charts, media controls and identifiers do not mirror | They read left to right inside a right-to-left line |
| Arabic sets one to two points larger, line height up 15 to 20% | Set too small it loses detail first on the cheap screens |
| No string concatenated with a count | Six plural categories in Arabic. Check the ones a reader notices: zero, one, two. |
| Every Arabic string marked `needs native review` | Until a native speaker has read it on a physical device |
| The longest locale does not break any layout | Indonesian runs 15 to 20% longer than English, Tagalog further |

A feature that passes in English and was not opened in Arabic has not been tested. Record
it as untested surface in your handoff `findings[]` rather than letting it read as covered.
