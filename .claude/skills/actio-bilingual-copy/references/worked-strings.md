# Worked strings

Read before writing a privacy, assignment, closing-the-loop or error string, and when you
measure a string across locales. Moved verbatim from `SKILL.md`; the rules are in `SKILL.md`.

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

## Length across locales

Worked example:

```
EN  Rosters are published less than 48 hours before your shift.          58 chars
ID  Jadwal kerja diumumkan kurang dari 48 jam sebelum giliran Anda.      63 chars  +9%
TL  Inilalabas ang roster nang wala pang 48 oras bago ang iyong shift.   66 chars  +14%
AR  .يتم نشر جداول العمل قبل أقل من 48 ساعة من مناوبتك                   ~50 chars −14%
```

A component designed to hold the English string will break in Tagalog. Design for 66, not
58.
