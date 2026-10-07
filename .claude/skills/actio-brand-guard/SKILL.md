---
name: actio-brand-guard
description: Enforce the Actio brand spec on any surface, string, component or asset. Use before designing, writing copy, building UI, or reviewing anything a user will see. Covers the pre-flight checklist, the highest-frequency failure modes with their fixes, and which vendored design skills are approved for Actio work.
---

# Brand guard

`BRAND.md` in the repository root is the spec. This skill does not repeat it. It is the operational bridge: what to check before you ship, and which vendored design skills you may apply to an Actio surface.

**Where a vendored skill and `BRAND.md` disagree, `BRAND.md` wins**, and the departure is recorded (see Recording an override) so it reads as a decision, not drift.

## References

Under `.claude/skills/actio-brand-guard/references/`.

| File | Holds | Read when |
|---|---|---|
| `common-failures.md` | The 13 failures that actually happen, why, and the fix beside each | A pre-flight line fails and you want the usual cause. An auditor never copies a fix from it into a finding |
| `vendored-names.md` | Directory name to the `name:` inside each vendored `SKILL.md` | Before invoking a vendored skill with the Skill tool, or naming one in any `skills:` field |

## Pre-flight, before any surface ships

Every line is a yes or a finding. Do not ship on a maybe.

### Colour

- [ ] Every colour traced to a token in `BRAND.md` §1. No new hex anywhere.
- [ ] Roughly 70% neutral surface, 20% ink text, 10% Vega. If Vega is doing more than punctuation, cut it.
- [ ] **One** accent element per view, marking the single primary action. Two primaries means neither is.
- [ ] At most one inverted surface per view: Cosmos `#0C0C0C` ground, Halo `#EFEFEF` text, Vega 200 `#6FE0E5` for the accent figure. It shares one accent budget with the primary button.
- [ ] Routing lane and status are never one colour. Lane is a 3px left accent rule at radius 0 in the state colour; status is a pill with a written label.
- [ ] No white on Vega 400 (2.27:1, fails). Cosmos on Vega 400 is the approved pairing (8.62:1). Vega 400 is never body text: Vega 600 or darker on a light ground.
- [ ] Sirius only in the account switcher and the parent wordmark. No Lumofy sibling accent anywhere, including a chart.
- [ ] No opacity applied to text.

### Type

- [ ] Source Sans 3 for headings (600, or 400), IBM Plex Sans for body and interface. No weight 300.
- [ ] Every number in IBM Plex Mono with `font-variant-numeric: tabular-nums`: rates, days to close, counts, dates, case identifiers, currency.
- [ ] Sentence case everywhere, buttons included. No Title Case; no all caps except Plex Mono labels at 12px, 0.02em.
- [ ] Measure at most 68 characters: constrain the container, do not shrink the type.
- [ ] Fonts self-hosted WOFF2. No public CDN: a blocked request is an unreadable survey.

### Space, radius, motion

- [ ] Every spacing value is 4, 8, 12, 16, 24, 32, 48 or 64. **14, 18, 20 and 30 do not exist** (R-04).
- [ ] Radius: 8 controls, 12 cards (a modal takes it), 999 pills, 0 on any single-sided border. No fourth token.
- [ ] Nothing in the document flow carries a shadow. Only overlays lift.
- [ ] Surfaces separate by lightness and space, not outline: a panel lifts off the Ink 50 page with the tint step (white), settled in `BRAND.md` v1.5 §1.1 and needing no override record. The Ink 150 hairline stays for repeated records, structural chrome edges and dividers inside one surface. A hairline doing the lifting, or a tint doing a row rule's job, is the defect. Surface, border and hover are three different values (R-06).
- [ ] One curve `cubic-bezier(.2, 0, .2, 1)`: 120ms micro, 200ms panel, 300ms ceiling, `transform` and `opacity` only.
- [ ] Every transition is reader-triggered. **Nothing animates on load** (a progress indicator reports work and is exempt). Nothing counts up, shimmers or draws itself; no spring, overshoot, stagger or parallax. `prefers-reduced-motion` honoured on every transition.

### Copy

- [ ] Sentence case. No emoji. No exclamation marks in system copy. No banned vocabulary (`BRAND.md` §5).
- [ ] Every percentage carries its sample size. Every status carries a written label, not only a colour.
- [ ] A competitor could not publish the sentence unchanged. If they could, it carries no information: rewrite it.

### Reality

- [ ] Designed at 360px first, desktop inheriting. Touch targets 48 by 48 minimum, tables included.
- [ ] All eight states covered: empty, loading, partial, error, dense, protected, below threshold, offline.
- [ ] Renders in both themes. Survives the longest locale (Bahasa Indonesia 15 to 20% longer, Tagalog further), not English.
- [ ] Mirrors for Arabic from logical properties alone. No clipping or overlap at 200% zoom.
- [ ] Contrast measured: WCAG ratios computed from the `BRAND.md` hex values in a node script, never estimated, both hex values recorded as evidence.

## Vendored skill policy

Twenty-two skills are vendored under `.claude/skills/`, unmodified, kept for their craft and not their aesthetics. Actio's brand overrides all of them, and **no swarm agent preloads one**: an agent reads one by path, from its On-demand references table, when the trigger fires. The tables name each skill by directory; `references/vendored-names.md` maps directory to `name:`.

### Approved for Actio surfaces

| Skill | Use it for | Watch for |
|---|---|---|
| `taste-skill` | Anti-generic layout, hierarchy, the audit-first method, pre-flight discipline | Its decorative suggestions and dials. Take the rigour, leave the polish |
| `minimalist-skill` | Editorial restraint, typographic contrast, flat surfaces | Its warm monochrome palette is not Actio's. Tokens come from `BRAND.md` |
| `web-design-guidelines` | Reviewing built UI against interface and accessibility guidelines | Nothing. It aligns closely |
| `composition-patterns` | React component API design, compound components, no boolean prop sprawl | Nothing. Structural, not visual |
| `react-best-practices` | React and Next.js performance, a user-safety concern on the target device | Nothing |
| `react-view-transitions` | Route and state transitions inside Actio's motion budget | One curve; a view transition is a panel transition, 200ms, 300ms ceiling; `transform` and `opacity` only, reader-triggered, nothing on load, reduced motion honoured |
| `writing-guidelines` | Prose and docs review | Actio's register is narrower. `BRAND.md` §5 wins on voice |
| `output-skill` | Preventing truncated or placeholder output on long generation | Nothing. It never lengthens a handoff or a final message |

### Conditional

| Skill | Condition |
|---|---|
| `redesign-skill` | Its **audit** method catches generic AI patterns. Never its "premium quality" remediation vocabulary (gradients, depth, gloss), and never its instruction to apply fixes |
| `brandkit` | Internal brand boards and presentation artefacts only. Never product UI, never to generate a mark. The seal is mathematically defined and never redrawn |

### Reference only, never applied to an Actio surface

| Skill | Why |
|---|---|
| `soft-skill` | Optimises for "expensive" through shadows, gradients and agency gloss. Actio bans all three |
| `brutalist-skill` | Analog degradation, extreme type contrast, military terminal. The opposite of a calm instrument |
| `stitch-skill` | Perpetual micro-motion and asymmetric premium layouts. The motion budget forbids the first |
| `gpt-tasteskill` | GSAP scroll pinning, AIDA marketing structure, randomised layout. None of it belongs in a queue |
| `imagegen-frontend-web`, `imagegen-frontend-mobile`, `image-to-code-skill` | Generated design images. Actio uses documentary photography and diagrams |
| `taste-skill-v1` | Superseded by `taste-skill`. Provenance only |
| `react-native-skills` | No native app in scope. Actio is WhatsApp, SMS and web |
| `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` | Hosting is out of scope until Shehab chooses a target. Coupled to no agent. The back end reaches Supabase through the MCP, never the CLI |

A reference-only skill that seems right for a task is an escalation to Shehab, not a judgement call: state which rule it would break and why the task needs it.

## Recording an override

When you depart from a vendored skill's advice or from any default, record it. The designer adds a row to the `## Overrides` table at the end of `spec.md`; any other agent adds a `checks[]` entry whose criterion names the departure and whose evidence is the file or rule that forced it.

| Departed from | What it advised | What I did | Why |
|---|---|---|---|
| taste-skill | Layered shadow on the card to lift it off the ground | The raised surface tint and space | `BRAND.md` §1.5: `shadow-inflow` is none. Only overlays lift |

A recorded override is a decision. A quiet one is drift, and drift makes a product look assembled rather than designed.
