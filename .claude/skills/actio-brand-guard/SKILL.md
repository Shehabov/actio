---
name: actio-brand-guard
description: Enforce the Actio brand spec on any surface, string, component or asset. Use before designing, writing copy, building UI, or reviewing anything a user will see. Covers the pre-flight checklist, the highest-frequency failure modes with their fixes, and which vendored design skills are approved for Actio work.
---

# Brand guard

`BRAND.md` in the repository root is the spec. This skill does not repeat it. This skill is
the operational bridge: what to check before you ship, what goes wrong most often, and
which of the vendored design skills you are allowed to apply to an Actio surface.

**Where a vendored skill and `BRAND.md` disagree, `BRAND.md` wins.** Record the override in
`.actio/runs/<run-id>/<agent>/review.md` so the next person knows the departure was
deliberate.

---

## Pre-flight, before any surface ships

Work through this. Every line is a yes or a finding. Do not ship on a maybe.

### Colour

- [ ] Every colour traced to a token in `BRAND.md` §1. No new hex anywhere.
- [ ] Roughly 70% neutral surface, 20% ink text, 10% Vega. If Vega is doing more than
      punctuation, cut it.
- [ ] **One** accent element per view. It marks the single primary action. Two primaries
      means neither is.
- [ ] At most one inverted surface per view: Cosmos `#0C0C0C` ground, Halo `#EFEFEF`
      primary text, Vega 200 `#6FE0E5` for the accent figure. The inverted surface and the
      primary button are the same accent budget.
- [ ] Routing lane and status are never merged into one colour. The lane is a 3px left
      accent rule at radius 0 in the state colour. The status is a pill with a written label.
- [ ] No white on Vega 400 anywhere. Measured 2.27:1, fails. Cosmos on Vega 400 is the
      approved pairing at 8.62:1.
- [ ] Vega 400 is never body text. Vega 600 or darker on a light ground.
- [ ] Sirius appears only in the account switcher and the parent wordmark. Nowhere else.
- [ ] No Lumofy sibling accent anywhere, including in a chart.
- [ ] No opacity applied to text.

### Type

- [ ] Source Sans 3 for headings, in 600 or 400. IBM Plex Sans for body and interface.
- [ ] Every number in IBM Plex Mono with `font-variant-numeric: tabular-nums`. Response
      rates, days to close, counts, dates, case identifiers, currency. All of them.
- [ ] Sentence case everywhere, including buttons. No Title Case. No all caps except Plex
      Mono labels at 12px with 0.02em tracking.
- [ ] No weight 300 anywhere. It collapses on the handsets frontline users carry.
- [ ] Measure at 68 characters maximum. Constrain the container, do not shrink the type.
- [ ] Fonts self-hosted as WOFF2. No public CDN. A blocked request is an unreadable survey.

### Space, radius, motion

- [ ] Every spacing value is one of 4, 8, 12, 16, 24, 32, 48, 64. **14, 18, 20 and 30 do
      not exist in this product.**
- [ ] Radius: 8px controls, 12px cards, 999px pills, 0 on any element with a border on one
      side only. A modal takes the card radius. There is no fourth radius token.
- [ ] Nothing in the document flow carries a shadow. Only overlays lift.
- [ ] Surfaces separate by lightness and space, not by outline: a panel lifts off the Ink 50
      page with the tint step. The Ink 150 hairline stays for repeated records, structural
      chrome edges and dividers inside one surface, where it separates rather than lifts.
      The `BRAND.md` amendment moving panel surfaces to a tint step is still open with
      Shehab, so either treatment is legal on a panel while the choice is recorded as an
      override. Mixing the two inside one view is not.
- [ ] One motion curve, `cubic-bezier(.2, 0, .2, 1)`. 120ms micro, 200ms panel, 300ms
      ceiling. Transform and opacity only.
- [ ] Every transition is triggered by a reader action. **Nothing animates on load.** The
      one exception is a progress indicator, which reports work rather than decorating an
      entrance.
- [ ] `prefers-reduced-motion` honoured on every transition without exception.
- [ ] Nothing counts up, nothing shimmers, no chart draws itself. No spring, overshoot,
      stagger or parallax.

### Copy

- [ ] Sentence case. No emoji. No exclamation marks in system copy.
- [ ] Every percentage carries its sample size.
- [ ] Every status carries a written label, not only a colour.
- [ ] No banned vocabulary. See `BRAND.md` §5.
- [ ] The one check: could a competitor publish this sentence unchanged? Then it carries
      no information. Rewrite it.

### Reality

- [ ] Designed at 360px first, desktop inheriting from it.
- [ ] Touch targets 48 by 48 minimum, including inside tables.
- [ ] All eight states covered: empty, loading, partial, error, dense, protected, below
      threshold, offline.
- [ ] Renders in both themes. A colour that works in only one mode is not part of the system.
- [ ] Survives the longest locale, not the English one. Bahasa Indonesia runs 15 to 20%
      longer, Tagalog further.
- [ ] Mirrors for Arabic using logical properties, without a second stylesheet.
- [ ] No clipping or overlap at 200% browser zoom.
- [ ] Contrast measured, not estimated, with both hex values recorded as evidence.

---

## The failures that actually happen

Ordered by how often they occur, with the fix beside each.

| Failure | Why it happens | Fix |
|---|---|---|
| White text on a Vega fill | Teal reads darker than it measures, so it looks fine on a designer's screen | Cosmos on Vega. Always. |
| Vega 400 used as link or body text on white | It is "the brand colour", so it feels correct | Vega 600 or darker |
| A second accent creeps in for a chart series or a badge | Three categories, one accent, so someone reaches for a sibling hue | Vega 400 primary, Ink 500 comparison, Vega 200 secondary. Nothing else. |
| A 20px or 18px gap | The eye wants a value between 16 and 24 | Pick 16 or 24. The gap between them is the point of a short scale. |
| Numbers set in the body face | The component was built before anyone read the type rules | Plex Mono, tabular, every number |
| A percentage with no sample size | It reads cleaner | It contradicts the product's own argument. Add `n=612`. |
| Two primary buttons on one view | Both actions feel important | One is primary. The other is secondary, and if that is wrong the screen has two jobs. |
| Rounded corners on a left accent rule | The component library rounds everything | Radius 0 on single-sided borders |
| A shadow used to separate two cards | Depth is the habit | The tint step and space. Only overlays lift. A hairline separates repeated records; it does not lift a panel. |
| Title Case on a button | Most design systems do it | Sentence case. Everywhere. |
| An empty state that apologises | It feels polite | An empty state is an invitation. Never "nothing here yet", never an apology. |
| A toast that congratulates | It feels friendly | A toast states a fact in the past tense with one undo. It does not congratulate. |
| Layout built with `margin-left` | Nobody was thinking about Arabic | `margin-inline-start`. Logical properties throughout. |

---

## Vendored skill policy

Twenty-two skills are vendored under `.claude/skills/`. They are unmodified from source and
kept for their craft, not for their aesthetics. Actio's brand overrides all of them.

The tables below name each skill by its directory. An agent's `skills:` frontmatter, and the
Skill tool, use the `name:` inside its `SKILL.md`, which differs for most of them:
`taste-skill` is `design-taste-frontend`, `taste-skill-v1` is `design-taste-frontend-v1`,
`minimalist-skill` is `minimalist-ui`, `output-skill` is `full-output-enforcement`,
`redesign-skill` is `redesign-existing-projects`, `soft-skill` is `high-end-visual-design`,
`brutalist-skill` is `industrial-brutalist-ui`, `stitch-skill` is `stitch-design-taste`,
`gpt-tasteskill` is `gpt-taste`, `image-to-code-skill` is `image-to-code`,
`composition-patterns` is `vercel-composition-patterns`, `react-best-practices` is
`vercel-react-best-practices`, `react-view-transitions` is `vercel-react-view-transitions` and
`react-native-skills` is `vercel-react-native-skills`. The rest keep their directory name.

### Approved for Actio surfaces

| Skill | Use it for | Watch for |
|---|---|---|
| `taste-skill` | Anti-generic layout, hierarchy, the audit-first method, the pre-flight discipline | Its decorative suggestions. Take the rigour, leave the polish. |
| `minimalist-skill` | Editorial restraint, typographic contrast, flat surfaces | Its warm monochrome palette is not Actio's. Tokens come from `BRAND.md`. |
| `web-design-guidelines` | Reviewing built UI against interface guidelines and accessibility | Nothing. This one aligns closely. |
| `composition-patterns` | React component API design, compound components, avoiding boolean prop sprawl | Nothing. Structural, not visual. |
| `react-best-practices` | React and Next.js performance, which is a user-safety concern on the target device | Nothing. |
| `react-view-transitions` | Route and state transitions, within Actio's motion budget | One curve `cubic-bezier(.2, 0, .2, 1)`; a view transition is a panel transition, so 200ms, and 300ms is the ceiling nothing exceeds. Transform and opacity only, reader-triggered, nothing animating on load, reduced motion honoured. |
| `writing-guidelines` | Prose and docs review | Actio's register is narrower. `BRAND.md` §5 wins on voice. |
| `output-skill` | Preventing truncated or placeholder output on long generation tasks | Nothing. |
| `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` | Front-end deploy and cost work | Back end is Supabase and deploys through the Supabase CLI. |

### Conditional

| Skill | Condition |
|---|---|
| `redesign-skill` | Use its **audit** method, which is genuinely good at catching generic AI patterns. Do not apply its "premium quality" remediation vocabulary, which is gradients, depth and gloss. |
| `brandkit` | Only for internal brand boards and presentation artefacts. Never for product UI, and never to generate a mark. The seal is mathematically defined and is never redrawn. |

### Reference only, never applied to an Actio surface

| Skill | Why |
|---|---|
| `soft-skill` | Optimises for "expensive" via shadows, gradients and agency gloss. Actio bans all three. |
| `brutalist-skill` | Analog degradation, extreme type contrast, military terminal. The opposite of a calm instrument. |
| `stitch-skill` | Perpetual micro-motion and asymmetric premium layouts. Actio's motion budget forbids the first. |
| `gpt-tasteskill` | GSAP scroll pinning, AIDA marketing structure, randomised layout variance. None of it belongs in a queue view. |
| `imagegen-frontend-web`, `imagegen-frontend-mobile` | Image generation. Actio uses documentary photography and diagrams, never generated comps. |
| `image-to-code-skill` | Depends on generated design images. See above. |
| `taste-skill-v1` | Superseded by `taste-skill`. Kept for provenance only. |
| `react-native-skills` | No native mobile app in scope. Actio is WhatsApp, SMS and web. |

If you believe a reference-only skill is right for a task, that is an escalation to Shehab,
not a judgement call. State which rule it would break and why the task needs it.

---

## Recording an override

When you depart from a vendored skill's advice, or from any default, write it in your
`review.md`:

```markdown
## Overrides

| Departed from | What it advised | What I did | Why |
|---|---|---|---|
| taste-skill | Layered shadow on the card to lift it off the ground | The raised surface tint and space | BRAND.md: nothing in the document flow carries a shadow. Only overlays lift. |
```

An override that is recorded is a decision. An override that is quiet is drift, and drift
is what makes a product look assembled rather than designed.
