---
name: actio-bilingual-copy
description: "Write and review Actio product copy in English and Arabic, with Bahasa Indonesia and Tagalog length budgeting. Use for any user-facing string: interface, error, empty state, notification, WhatsApp or SMS template. Defines the catalogue schema, the Arabic rules, plural sets, the competitor test and the before-handing-off list, and scripts/catalogue.mjs (check, ship) validates a run catalogue against string-slots.json. Worked strings, WhatsApp and SMS rules and code checks are in references/."
---

# Bilingual copy

Actio writes the way a competent operations lead speaks: someone who has already read the
file, knows what happened, and is telling you what is being done about it. Not a companion,
not a coach, no name it speaks in, no first person. The reader deciding whether to answer
honestly is assessing risk: enthusiasm reads as a sales pitch, precision as a system that
will behave predictably. Full voice rules are `BRAND.md` §5; this is the working method.

---

## The method

Write every string through these four filters, in order.

**1. Does it name something.** The left column names a person, a number, a date or a
mechanism. The right names a feeling or an intention.

| Write | Not |
|---|---|
| Assigned to Dewi, due 14 March | Action item successfully created |
| 3 of 8 actions closed this cycle | You are crushing it this quarter |
| We cannot change pay bands this quarter. The budget is set until July. | We are looking into it |
| 41% responded (n=612) | Great engagement |
| This goes to your site director | Escalating to leadership |
| Could not send. Check the number. | Oops, something went wrong |
| Your manager sees this grouped with 11 other responses | Your response is completely anonymous |
| Closed 12 days late. Evidence attached. | Completed |
| Rosters are published under 48 hours before the shift. | Schedule communication is an opportunity area |

**2. The one check.** Could a competitor publish this sentence unchanged? Then it carries no
information: rewrite it. This removes more bad copy than every other rule combined. Record
it per sentence and per locale as `competitor: "pass"`, never by assertion.

**3. Register by reader.**

| Reader | How |
|---|---|
| Employee | Shortest sentences. Describe the mechanism, not the intention |
| Team lead | Lead with the action and the deadline |
| Operations | Volume, trend, and where the load falls |
| Executive | The number first, then the structural reading |
| Errors | What happened, then the next step. Two sentences at most. No apology. Never blame the reader (`Could not send`, not `You entered an invalid number`) |
| Privacy | Precise and unhurried. Never soften a limitation |

**4. Mechanics.**

- Sentence case everywhere, buttons and headings included. No all-caps outside a Plex Mono label.
- No exclamation marks in system copy. No emoji anywhere in the product. No first person.
- Numbers before adjectives (`6 days overdue`). Name the person and the date. Say plainly what
  cannot be done: a refusal with a reason beats a soft holding line.
- Every percentage carries its sample size, `41% responded (n=612)`, and so does every count of
  a population. Every status carries its written label: colour or an icon is never the only carrier.
- Never: empower, seamless, unlock, leverage, journey, supercharge, delight, effortless,
  revolutionise, game-changing, moments that matter, listening strategy, people leader.
  Never in errors: oops, sorry, unfortunately, something went wrong, please try again later,
  an unexpected error occurred.
- A button says what will happen: `Assign owner`, not `OK`, `Submit` or `Continue`.
- Single-name users exist. Never a label or validation message that demands a surname.
- No idiom, metaphor or wordplay in any locale. The reader is on a small screen, in a second
  language, in a noisy room, between tasks.
- Dates (`BRAND.md` §8, v1.5): `14 Mar 2026` in tables, identifiers and numeric columns,
  `14 March` in running prose, never numeric-only (`03/04` is ambiguous). "Every date is
  `DD MMM YYYY`" is not the rule.

---

## The string catalogue

Two files, one per locale, written once: `.actio/runs/<run-id>/ux-writer/strings-en.json` and
`strings-ar.json`, each `{"strings": {"<key>": {...}}}`. Nothing else is a source: no
`strings.md`, no `length-budget.md`. No string exists in the product that is not a row.

| Field | Rule |
|---|---|
| key | `<surface>.<slot>`, lower case, dot-separated (`privacy.group_size`), matching `surface` and `slot` in `string-slots.json`. A string with no slot (an error `message_key`, a `_label_key`, a template) takes the key the architect's brief names. Never reused across surfaces |
| `text` | Final, never a placeholder. A string with a count is an object of full plural variants instead, the count inside each as `{count}` |
| `reader` | `employee`, `lead`, `operations` or `executive`: one value, never "user". en row |
| `context` | What just happened and what happens next if they act. One sentence. en row |
| `competitor` | `"pass"`, in both rows, once the one check has been run on that text |
| `drafts` | `{"id": "...", "tl": "..."}` Bahasa Indonesia and Tagalog drafts of the same string (the longest variant for a plural). They exist to measure length and are not shipped. en row |
| `max_chars` | Only for a key with no slot, measured on the longest locale. A slot key omits it: the slot is the source, and a differing value is `BUDGET_DRIFT` |
| `ltr_runs` | ar row. The substrings that stay left to right inside Arabic: numerals, IDs, phone numbers, Latin names, `{placeholders}`. `[]` if none |
| `ar_review` | ar row. `"needs native review"`, or `{"reviewer", "device", "date"}` once a named native speaker has read it on a physical device |

```json
"privacy.group_size": { "text": "People in your group", "reader": "employee", "context": "Privacy preview, row label",
  "competitor": "pass", "drafts": { "id": "Jumlah orang di grup Anda", "tl": "Bilang ng tao sa grupo mo" } }
```

Check and ship, from the repository root:

```
node .claude/skills/actio-bilingual-copy/scripts/catalogue.mjs check .actio/runs/<run-id> [--slots <path>]
node .claude/skills/actio-bilingual-copy/scripts/catalogue.mjs ship  .actio/runs/<run-id> [--slots <path>]
```

`check` prints one line per finding (`FAIL <key> <CODE> <detail>`: a slot without a row, a
missing locale, a bad key, an empty or exclamatory or emoji or banned-word text, a `%`
without `(n=...)`, a numeric-only date, a missing or incomplete plural set, a missing
`ltr_runs` or `ar_review`, `NO_BUDGET`, `OVER_BUDGET` against the longest of en, ar, id and
tl) and a summary with the slots file's sha256. Exit 0 clean, 1 findings, 2 unreadable.
`ship` runs `check`, refuses on any finding, then overlays the text into
`content/strings/{en,ar}.json`, keys sorted, never deleting a key. The script is the
mechanical floor. It cannot judge truth, register, the competitor test or the base of a bare
count: those are yours.

**Every Arabic string ships marked `needs native review` until a native speaker has read it
on a physical device.** The writer never clears the mark; the release gate checks for it.

---

## Slots, budgets and the flow

- Work from `string-slots.json` as soon as it exists. Do not wait for the design gate: the
  auditor runs beside you. If the audit changes a slot, the orchestrator resumes you for a
  delta pass: change only the affected rows and re-run `check`. The copy gate certifies the
  final catalogue against the final slots: record the sha256 `check` prints in `checks[]`.
- Start earlier still on what needs no layout: the architect's brief lists the keys it needs
  ("Keys for ux-writer"): `message_key`s, `_label_key`s and templates. Every error code needs
  a human message; a code with none is rejected back.
- Slots have `max_chars` and `longest_locale`, set by the designer. A slot with no budget, or
  one measured on English, goes back to ux-designer. Over budget: rewrite shorter. If the
  slot is wrong, that is a blocker naming ux-designer. Never truncate.

| Locale | Relative to English | Note |
|---|---|---|
| English | baseline | |
| Bahasa Indonesia | +15 to 20% | The usual worst case for Latin script |
| Tagalog | can exceed Indonesian | Measure, do not assume |
| Arabic | around -15% | Shorter, but taller: line height +15 to 20% |

The worked length example is in `references/worked-strings.md`.

---

## Plurals

**Never concatenate a string containing a count.** Indonesian and Tagalog form plurals
differently from English, and the result is wrong in a way nobody on the team can read.
Never `` `${count} ` + t('issues_overdue') ``, never a suffix rule, never a ternary in a
template. Write full variants with the count inside each:

```json
"queue.overdue": { "one": "{count} item is overdue", "other": "{count} items are overdue" }
```

English needs `one` and `other`. Arabic has six categories, `zero`, `one`, `two`, `few`,
`many`, `other`, and all six are required, or the library falls back and the sentence is wrong
at exactly the counts a reader notices.

---

## Arabic

Arabic is written, not translated. A literal translation of a soft English sentence produces
a soft Arabic one. Write it from the same brief the English came from. A string whose literal
Arabic would go soft is written in Arabic first. A sentence that only makes sense as a
translation gets rewritten.

| Rule | Detail |
|---|---|
| Register | Modern Standard Arabic. No dialect: the workforce spans several and none is neutral |
| Numerals | Western (0 to 9), set in IBM Plex Mono. Eastern Arabic numerals are not used |
| Punctuation | Arabic comma `،`, semicolon `؛`, question mark `؟`. The full stop is shared |
| Dates | Gregorian, Western numerals. Tables and identifiers keep `14 Mar 2026` (an `ltr_runs` entry); running prose uses the Arabic month name |
| Mixed strings | Latin names, IDs, phone numbers and numerals stay left to right: list each in `ltr_runs`, and frontend wraps them `dir="ltr"` with `unicode-bidi: isolate`, or they reorder |
| Typography | Never letterspace, synthesise a bold, justify with kashida or apply a case transform; Arabic has no italic. Emphasis comes from a real weight or from position. `BRAND.md` §7.2 governs |

---

## WhatsApp and SMS

No logo, colour or header image. Billing is per message, so structured exchanges beat chatty
ones. The privacy mechanic is in the first message, before any question; the SMS fallback is
under 160 characters and compresses it but never drops it. Examples are in
`references/whatsapp-sms.md`.

---

## English and Arabic ship together

Every feature exists in English and Arabic: no English-only release, no Arabic backlog.
English is authored first, Arabic immediately after against the same standard in the same
run, and neither is done until both exist. A feature that reaches production in English only
is a defect of class `locale`.

| Role | Bound by |
|---|---|
| `tech-architect` | A brief that names a screen names both languages in its acceptance criteria |
| `ux-designer` | Every slot is budgeted for the longest locale, not English |
| `ux-writer` | Both columns filled before the copy gate |
| `frontend-engineer` | Both catalogues resolve; a missing key is a build failure, not a fallback to English |
| `qc-engineer` | Every flow tested in both, RTL at every width |
| `qc-lead` | A release with one language partial is a no-go |

---

## Before handing off

`check` exits 0, and then what it cannot see:

- [ ] Every slot has a string, every error code and `_label_key` in the brief has a row, and
      every Arabic row has its `ar_review` state.
- [ ] Every figure in a string states its base: grep the rows for digits and `{count}`.
- [ ] The one check was run on every sentence in both locales, not asserted.
- [ ] The Arabic reads as Arabic. Prose over one sentence has been through `writing-guidelines`.
- [ ] Anything you could not write truthfully is a blocker, not a softened sentence.

---

## References

| File | Holds | Read when |
|---|---|---|
| `references/worked-strings.md` | The four highest-stakes pieces of copy, and the length example | Writing a privacy, assignment, closing-the-loop or error string; measuring across locales |
| `references/whatsapp-sms.md` | A WhatsApp first message in both languages, the SMS rule | Writing any WhatsApp or SMS template |
| `references/code-checks.md` | The greps that prove no visible string or count concatenation lives outside the catalogue | Source under `web/`, `extension/` or `supabase/` exists for the copy gate |
