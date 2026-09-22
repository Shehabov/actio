---
name: actio-bilingual-copy
description: Write and review Actio product copy in English and Arabic, with Bahasa Indonesia and Tagalog length budgeting. Use for any user-facing string: interface, error, empty state, notification, WhatsApp or SMS template, and for reviewing existing copy.
---

# Bilingual copy

Actio writes the way a competent operations lead speaks: someone who has already read the
file, knows what happened, and is telling you what is being done about it. Not a
companion, not a coach, no name it speaks in, no first person.

The reader deciding whether to answer honestly is assessing risk. Enthusiasm reads as a
sales pitch. Precision reads as a system that will behave predictably.

Full voice rules are in `BRAND.md` §5. This skill is the working method.

---

## The method

Write every string through these four filters, in order.

### 1. Does it name something

The approved column names a person, a number, a date or a mechanism. The rejected column
names a feeling or an intention.

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
| Nothing has changed here since March. | Keep up the momentum |
| Rosters are published under 48 hours before the shift. | Schedule communication is an opportunity area |

### 2. The one check

**Could a competitor publish this sentence unchanged?** Then it carries no information.
Rewrite it. This single test removes more bad copy than every other rule combined.

### 3. Register by reader

| Reader | How |
|---|---|
| Employee | Shortest sentences. Describe the mechanism, not the intention. |
| Team lead | Lead with the action and the deadline. |
| Operations | Volume, trend, and where the load falls. |
| Executive | The number first, then the structural reading. |
| Errors | What happened, then the next step. No apology. Never blame the reader. |
| Privacy | Precise and unhurried. Never soften a limitation. |

### 4. Mechanics

- Sentence case everywhere, including buttons and headings.
- No exclamation marks in system copy. No emoji anywhere in the product.
- Every percentage carries its sample size: `41% responded (n=612)`.
- Every status carries its written label.
- Never these words: empower, seamless, unlock, leverage, journey, supercharge, delight,
  effortless, revolutionise, game-changing, moments that matter, listening strategy,
  people leader.
- Never these in errors: oops, sorry, unfortunately, something went wrong, please try
  again later, an unexpected error occurred.
- Button labels state what will happen: `Assign owner`, not `OK`, `Submit` or `Continue`.

---

## The string catalogue

One row per string. This is the artefact `frontend-engineer` and `backend-engineer`
consume, and the one `ux-auditor` checks lengths against.

Path: `.actio/runs/<run-id>/ux-writer/strings.md`, with machine-readable
`strings.en.json` and `strings.ar.json` beside it.

| Key | Reader | EN | AR | Max | Context | AR reviewed |
|---|---|---|---|---|---|---|
| `privacy.group_size` | employee | People in your group | عدد الأشخاص في مجموعتك | 32 | Privacy preview, row label | needs native review |
| `privacy.floor` | employee | Smallest group we will report on | أصغر مجموعة سنعرض نتائجها | 40 | Privacy preview, row label | needs native review |
| `issue.assign` | team lead | Assign owner | تعيين مسؤول | 18 | Primary button, issue card | needs native review |
| `error.send_failed` | any | Could not send to {phone}. Check the number and try again. | تعذّر الإرسال إلى {phone}. تحقّق من الرقم وحاول مرة أخرى. | 90 | Toast | needs native review |

`Max` is the character budget for the **longest** locale that will occupy the slot, not
for English. See length budgeting below.

**Every Arabic string ships marked `needs native review` until a native speaker has read
it on a physical device.** That is a brand rule, not a nicety, and the release gate checks
for it.

---

## Length budgeting

Give the designer the longest variant, never the English one.

| Locale | Relative to English | Note |
|---|---|---|
| English | baseline | |
| Bahasa Indonesia | +15 to 20% | The usual worst case for Latin script |
| Tagalog | can exceed Indonesian | Measure, do not assume |
| Arabic | around −15% | Shorter, but taller. Line height increases 15 to 20%. |

Worked example:

```
EN  Rosters are published less than 48 hours before your shift.          58 chars
ID  Jadwal kerja diumumkan kurang dari 48 jam sebelum giliran Anda.      63 chars  +9%
TL  Inilalabas ang roster nang wala pang 48 oras bago ang iyong shift.   66 chars  +14%
AR  .يتم نشر جداول العمل قبل أقل من 48 ساعة من مناوبتك                   ~50 chars −14%
```

A component designed to hold the English string will break in Tagalog. Design for 66, not
58.

---

## Plurals

**Never concatenate a string containing a count.** Indonesian and Tagalog form plurals
differently from English, and the result is wrong in a way nobody on the team can read.

Wrong:

```js
`${count} ` + t('issues_overdue')
```

Right, full variants per plural form, with the count interpolated inside each:

```json
{
  "queue.overdue": {
    "one": "{count} item is overdue",
    "other": "{count} items are overdue"
  }
}
```

Arabic has six plural categories: `zero`, `one`, `two`, `few`, `many`, `other`. Supply all
six or the library will fall back and the sentence will be wrong at exactly the counts a
reader notices.

---

## Arabic

Arabic is written, not translated. A literal translation of a soft English sentence
produces a soft Arabic one, and the whole point of the register is lost.

| Rule | Detail |
|---|---|
| Register | Modern Standard Arabic. No dialect. The workforce spans several and none is neutral. |
| Numerals | Western Arabic figures (0 to 9) throughout, set in IBM Plex Mono. Eastern Arabic numerals are not used, so one number format reads across every locale. |
| Punctuation | Arabic comma `،`, semicolon `؛`, question mark `؟`. The full stop is shared with Latin. |
| Dates | Gregorian. `١٤ مارس ٢٠٢٦` is not used; write `14 Mar 2026` in tables and identifiers, and the Arabic prose form in running text. |
| Letterspacing | Never. Arabic letters join and tracking breaks the connections, producing text that reads as damaged. |
| Weight | Real weights only, from IBM Plex Sans Arabic. Never synthesise a bold: joins break and letterforms distort. |
| Italic | Does not exist in Arabic. Emphasis comes from weight or position. |
| Case | Arabic has no case. Never apply a capitalisation transform. |
| Justification | No kashida elongation in the interface. Set ragged. |
| Mixed strings | Latin product names, identifiers and phone numbers stay in Latin script and left-to-right order inside an Arabic sentence. Wrap them `dir="ltr"` with `unicode-bidi: isolate`, or numbers and identifiers reorder unpredictably. |

---

## Worked strings

The four highest-stakes pieces of copy in the product.

### The privacy preview

The tone is flat and mechanical. Any warmth here reads as persuasion, and persuasion is
what the reader is guarding against. Every figure is live.

```
EN  Before you answer
    Your answers are pooled with everyone at Warehouse B who joined in the last 60 days.

    People in your group                                    23
    Smallest group we will report on                         5
    Your manager can filter by              Site and tenure
    Free text is shown              Reworded, names removed

    If fewer than 5 people answer, nothing from your group is shown to anyone.

    [Start]  About two minutes

AR  قبل أن تجيب
    تُجمَّع إجاباتك مع جميع العاملين في المستودع B الذين التحقوا خلال آخر 60 يومًا.

    عدد الأشخاص في مجموعتك                                  23
    أصغر مجموعة سنعرض نتائجها                                5
    يستطيع مديرك التصفية حسب              الموقع ومدة الخدمة
    يُعرض النص الحر              بصياغة معادة، بدون أسماء

    إذا أجاب أقل من 5 أشخاص، فلن يُعرض أي شيء من مجموعتك لأحد.

    [ابدأ]  نحو دقيقتين
```

Note what it does not say: it never uses the word anonymous. It shows the mechanism
instead, because no reassurance in a privacy policy changes what an employee believes.

### An assignment notification, to a team lead

```
EN  Six night shifts in a row · Warehouse B
    Raised by 3 teams. 41% responded (n=612).
    Routed to workforce planning, which you do not control.
    Your part: one to ones with the four people named. Due 14 March.

AR  ست مناوبات ليلية متتالية · المستودع B
    أثارها 3 فرق. استجاب 41% (n=612).
    أُحيلت إلى تخطيط القوى العاملة، وهي خارج نطاق صلاحيتك.
    دورك: اجتماعات فردية مع الأشخاص الأربعة المذكورين. الموعد 14 مارس.
```

### Closing the loop, to the employee

Three headings, always these three, in this order.

```
EN  What we heard
    Rosters published under 48 hours before the shift. Three teams raised it.

    What we are doing
    Workforce planning owns it. Due 14 March.

    What we cannot do
    Pay bands are set until July.

AR  ما سمعناه
    تُنشر جداول العمل قبل أقل من 48 ساعة من المناوبة. أثارت ذلك ثلاثة فرق.

    ما نقوم به
    تخطيط القوى العاملة هو المسؤول. الموعد 14 مارس.

    ما لا نستطيع فعله
    نطاقات الأجور محددة حتى يوليو.
```

The third heading is the one that keeps people answering the next round. A stated
limitation with a reason outperforms silence.

### Errors

Two sentences at most. What happened, then what to do. No apology, never blame the reader.

| State | EN | AR |
|---|---|---|
| No connection | We could not reach the server. Your answers are saved on this device and will send when you are back online. | تعذّر الوصول إلى الخادم. إجاباتك محفوظة على هذا الجهاز وستُرسَل عند عودة الاتصال. |
| Group too small | Fewer than 5 people answered. Nothing from this group will be shown. | أجاب أقل من 5 أشخاص. لن يُعرض أي شيء من هذه المجموعة. |
| Evidence missing | This item cannot be closed until a file or a note is attached. | لا يمكن إغلاق هذا البند حتى يتم إرفاق ملف أو ملاحظة. |

`Could not send` is correct. `You entered an invalid number` is not: it attributes the
failure to the reader.

---

## WhatsApp and SMS

No logo, no colour, no header image. The employee already knows who sent it, and every
decorative byte is billed. Billing has been per message since July 2025, so structured
exchanges beat chatty ones and each conversational flourish carries a price.

**The privacy mechanic appears in the first message, before any question.** That sentence
does more work than the survey design.

```
EN  Hi Ayu. You have been with us 30 days. Eight short questions, about two minutes.
    Your answers are grouped with at least 5 others. Your supervisor cannot see who
    said what.

AR  مرحبًا آيو. مضى على انضمامك 30 يومًا. ثماني أسئلة قصيرة، نحو دقيقتين.
    تُجمَّع إجاباتك مع 5 أشخاص آخرين على الأقل. لا يستطيع مشرفك معرفة من قال ماذا.
```

SMS fallback is under 160 characters, so the privacy sentence is compressed but never
dropped.

---

## No idiom, in any locale

No idioms, metaphors or wordplay anywhere. The reader is frequently on a small screen, in
a second language, in a noisy room, between tasks. Every one of those makes figurative
language cost more to parse than it is worth.

---

## Before handing off

- [ ] Every slot the designer listed has a string.
- [ ] Every string exists in both English and Arabic.
- [ ] Every Arabic string marked `needs native review`.
- [ ] No string concatenates a count. Plural variants supplied, all six for Arabic.
- [ ] Every percentage carries its sample size.
- [ ] Max length recorded per slot, set by the longest locale.
- [ ] The one check run on every sentence.
- [ ] Anything you could not write truthfully is flagged as a blocker rather than softened.

---

## English and Arabic ship together

**Every feature and every product version exists in English and Arabic.** There is no
English-only release and no Arabic backlog.

| Order | |
|---|---|
| 1 | English is authored first. It is the language the spec, the brief and the acceptance criteria are written in, so it is the one that gets argued over. |
| 2 | Arabic is written immediately after, against the same standard, for the same feature, in the same run. Not the next run. |
| 3 | Neither is done until both exist. A string catalogue with an English column filled and an Arabic column empty fails the copy gate. |

Arabic is **written, not translated**. A literal translation of a soft English sentence
produces a soft Arabic one, and the register is the whole point. The method, the register
and the mechanics are the sections above, and they apply identically to both languages.

Every Arabic string ships marked `needs native review` until a native speaker has read it
on a physical device. That mark is not a caveat on the delivery, it is part of it: the
feature ships with both languages and the review state recorded.

### What this binds

| Role | |
|---|---|
| `tech-architect` | A task brief that names a screen names both languages in its acceptance criteria |
| `ux-designer` | Every string slot is budgeted for the longest locale, not for English |
| `ux-writer` | Both columns filled before the copy gate is set |
| `frontend-engineer` | Both catalogues resolve. A missing key in either is a build failure, not a fallback to English. |
| `qc-engineer` | Every flow tested in both, including RTL layout at every width |
| `qc-lead` | A release with one language complete and the other partial is a no-go |

A feature that reaches production in English only is a defect of class `locale`, and it is
recorded in `BUGS.md` like any other.
