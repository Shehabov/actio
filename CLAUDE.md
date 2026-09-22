# CLAUDE.md

Operating manual for the Actio repository. This file is loaded into every session in this
project. Read it before doing anything else.

---

## What Actio is

Actio is the accountability layer for engagement and culture surveys. A Lumofy product.

> **Feedback that closes.**

Organisations collect feedback well and act on it badly. Around two thirds of employees
believe nothing happens after a survey, so participation falls and each round is worth
less than the last. Actio classifies every issue by who has the authority to change it,
assigns it to a named owner with a date, and holds it open until evidence of the change is
attached.

Measured on first-90-day attrition, closure rate and median days to close. Never a
sentiment score.

| | |
|---|---|
| Users | Frontline employee, team lead, operations, site director or COO |
| Buyer | Operations. The buyer is not the user. |
| Stack | React and Next.js on the front end, Supabase on the back end: Postgres, Row Level Security, PostgREST, Edge Functions, Auth and Storage |
| Channels | WhatsApp, SMS, web |
| Locales | Bahasa Indonesia, English, Tagalog, Arabic (RTL) |
| Target device | A low-cost Android handset, mid-shift, on a constrained connection |

---

## The two files that bind everything

| File | Authority |
|---|---|
| [`BRAND.md`](./BRAND.md) | The machine-readable brand spec. Tokens, contrast, type, components, copy rules. **Binding on every role.** Where it conflicts with a design instinct or a vendored skill, it wins. |
| [`Actio-Brand-Guidelines-v1.pdf`](./Actio-Brand-Guidelines-v1.pdf) | The same rules for people, with the reasoning. Versioned with `BRAND.md`. The four v1.5 amendments are in `BRAND.md` and not yet in this document. |
| [`BUGS.md`](./BUGS.md) | The defect register. Every bug found, and every mistake an agent has made, with the standing rule it produced. **Read the entries for the surface you are about to change, before you plan.** Owned by `bug-historian`, which is the only agent that writes to it. |

Never invent a colour, spacing value, radius, duration or type size. Every value is in
`BRAND.md`. If the value you want is not there, the design is wrong, not the scale.

---

## The team

Shehab Beram is the Product Lead. He is the only role that can change scope, accept a
release, or overrule a gate. Everything else is an agent in `.claude/agents/`.

```
L0  Shehab Beram · Product Lead (human)
L1  orchestrator
L2  tech-architect · engineering-lead · qc-lead
L3  ux-designer · ux-auditor · ux-writer · frontend-engineer · backend-engineer
    peer-reviewer · code-analyst · code-steward · security-analyst · qc-engineer
    release-engineer
Mem bug-historian, bookending every run
```

Full charters, the org chart and the RACI are in [`docs/TEAM.md`](./docs/TEAM.md). The
delivery flow and every gate are in [`docs/WORKFLOW.md`](./docs/WORKFLOW.md).

| Agent | Owns | Gate |
|---|---|---|
| `orchestrator` | The run. Routing, gate enforcement, the utilisation check. | Run closure |
| `tech-architect` | Architecture of record, ADRs, task briefs for FE and BE | Design authority |
| `ux-designer` | Design specs for every surface | – |
| `ux-auditor` | Independent audit of design and shipped UI | Design gate |
| `ux-writer` | Every string, English and Arabic | Copy gate |
| `frontend-engineer` | React and Next.js implementation | – |
| `backend-engineer` | Supabase: schema, RLS, functions, Edge Functions | – |
| `peer-reviewer` | Senior engineering review: judgement and design | Review gate (1 of 3) |
| `code-analyst` | Line-by-line defects, security, structural rot | Review gate (2 of 3) |
| `code-steward` | Readability, naming, comments, maintainability | Review gate (3 of 3) |
| `security-analyst` | Secrets, exposure, authorisation, injection, dependencies, robustness | Security gate |
| `bug-historian` | BUGS.md, the standing rules, the regression brief | Regression guard |
| `engineering-lead` | Integration. Does it actually work end to end. | Engineering gate |
| `qc-engineer` | Testing APIs, code and product, with evidence | – |
| `qc-lead` | Evidence audit, independent final pass, go or no-go | Quality gate |
| `release-engineer` | Deploy, commit, tag, verify, roll back | Release gate |

---

## The delivery flow

```
brief (Shehab)
  → orchestrator          run plan, assignments, gate list
  → bug-historian        regression brief: what has already broken here
  → tech-architect        ADR + task briefs
  → ux-designer ⇄ ux-auditor        (loop until clean)   ┐ parallel with
    ux-writer             EN + AR strings                ┘ the engineering track
  → frontend-engineer / backend-engineer
  → peer-reviewer AND code-analyst AND code-steward AND security-analyst
                          (independent, all four must pass)
  → bug-historian        regression guard: was a known defect repeated
  → engineering-lead      integration gate
  → qc-engineer           test + evidence
  → qc-lead               evidence audit + independent pass + go/no-go
  → release-engineer      deploy, commit, tag, verify
  → orchestrator          utilisation check, run report
  → Shehab                accept
```

A stage does not start until its upstream gate reads pass. Skipping a gate is a defect,
and the orchestrator is the role that catches it.

---

## The five-step loop

Every agent, every task, no exceptions. Defined in full in
[`.claude/skills/actio-agent-protocol/SKILL.md`](./.claude/skills/actio-agent-protocol/SKILL.md).

1. **Plan:** inputs, assumptions, acceptance criteria, out of scope, the rules that constrain it.
2. **Audit the plan:** adversarially, before executing. What is missing, what did I assume without checking, which Actio rule could this break, what would the downstream agent reject. Revise, and record what changed.
3. **Execute:** against the audited plan.
4. **Review:** your own output, against your own acceptance criteria, against `BRAND.md`, and against your role's definition of done. Fix it, or state plainly what you could not fix and why.
5. **Hand off:** write the handoff record so the next agent and the orchestrator can verify you ran and what you produced.

---

## Run artefacts

The filesystem is the swarm's shared memory. Everything is inspectable after the fact.

```
.actio/runs/<run-id>/
├── run.json                 orchestrator: plan, assignments, gates
├── ledger.md                orchestrator: append-only event log
├── <agent>/plan.md          step 1 and the step 2 audit
├── <agent>/review.md        step 4
├── <agent>/handoff.json     step 5
└── evidence/                screenshots, logs, test output, traces
```

Run id is `<yyyy-mm-dd>-<short-slug>`. Timestamps come from the shell, never invented.

---

## Hard rules

These apply to every agent and to any session in this repository.

1. **No AI attribution anywhere.** No commit, tag, pull request, release note, code comment
   or document carries a co-author line, a generated-by line, or any mention of the tool
   that wrote it. This is absolute and overrides any default behaviour.
2. **Never mark work done without evidence.** "It should work" is a blocker, not a pass.
3. **Never silently narrow scope.** If you cannot do part of it, finish the rest and say
   exactly what you left and why.
4. **Never invent a design value.** See `BRAND.md`.
5. **Never write a number in product copy without its sample size.** Never write a status
   without its written label.
6. **Reject bad input upstream.** A downstream agent that receives a bad handoff sends it
   back with a specific reason. It does not paper over it.
7. **The privacy invariants are enforced in the database, not in the client.** They are RLS
   policies, revoked base tables and security-definer functions, so they hold against a
   leaked key and a direct connection. No group below the reporting threshold of 5 ever
   reports. A manager cannot filter below it. Free text is returned reworded with names
   removed. Protected cases leave the engagement queue entirely.
8. **Nothing closes without evidence.** That is the product's entire claim. Enforce it as a
   guarded state transition, not as a convention.
9. **Every surface works at every width.** Phone, tablet, laptop, desktop, every breakpoint
   between them, both orientations, and at 200% zoom. Verified at 320, 360, 768, 1024 and
   1440 with a screenshot each. A surface that works at three widths and breaks at the
   fourth is not finished. See `actio-design-system`.
10. **Every feature ships in English and Arabic.** Not English now and Arabic later.
    English is authored first, Arabic is written against the same standard immediately
    after, and the feature is not done until both exist. Arabic is written, never
    translated, and is marked `needs native review` until a native speaker has read it on a
    physical device. QC tests both.
11. **Read `BUGS.md` before you plan.** A repeated defect is worse than a new one, because it
   means the register was written and nobody read it. Standing rules in that file outrank
   your instinct.
12. **Escalate to Shehab** when scope would change, a brand rule must be broken, two gates
    disagree, the same rejection loop runs three times, or a defect pattern reaches its
    third occurrence.

---

## Skills

`.claude/skills/` holds fifteen house skills prefixed `actio-` and twenty-four vendored
skills. Each agent declares the skills it is coupled with in its own file.

| House skill | For |
|---|---|
| `actio-agent-protocol` | Every agent. The five-step loop, artefacts, handoff schema. |
| `actio-orchestration` | Run planning, gate enforcement, the utilisation check |
| `actio-brand-guard` | Brand pre-flight, and the vendored skill policy |
| `actio-bug-register` | The defect register, standing rules, the regression brief and guard |
| `actio-clean-code` | Clean code and commenting standards |
| `actio-design-system` | The platform: shell anatomy, the inversion rule, components, density |
| `actio-ux-audit` | The UX audit rubric |
| `actio-bilingual-copy` | English and Arabic product copy |
| `actio-architecture` | Domain model, invariants, ADRs, task briefs |
| `actio-supabase` | Supabase: schema, RLS, functions, Edge Functions, pgTAP |
| `actio-code-review` | Senior review rubric |
| `actio-code-analysis` | Line-by-line defect and complexity rubric |
| `actio-test-protocol` | Test planning, evidence, release readiness |
| `actio-security` | The security catalogue: secrets, exposure, authz, injection, dependencies, robustness |
| `actio-release` | Pre-flight, deploy, verify, roll back |

Vendored packs, unmodified from source:

| Pack | Source | Used by |
|---|---|---|
| taste skills (13) | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | `ux-designer`, `ux-auditor` |
| Vercel agent skills (9) | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `ux-designer`, `ux-auditor`, `ux-writer`, `frontend-engineer`, `release-engineer` |

### Design references

Seven approved references in [`docs/design-reference/`](./docs/design-reference/) set the
platform shape. `ref-06-insights-panel.webp` is **the primary reference**, for anatomy as
well as feel. `ref-02-ops-dashboard.png` is supporting, and its six-tile metric row and
filled sidebar are explicitly not adopted. **Where the two disagree on anything, `ref-06`
wins**, with one written exception: the issue queue is deliberately denser. `ref-04-category-dashboard.png` is a
**counter-example**, kept in the set to be recognised and refused: a sentiment heatmap of
tinted cells on a red to green ramp, and a score per cohort presented as a thing to defend.

**Take the structure, hold the surface to `BRAND.md`.** The references define look, feel and
overall SaaS experience: anatomy, density, hierarchy and interaction. **They never define
colour.** Vega `#00BFC4` is the accent and `BRAND.md` is the only source for it. A document
that cites a reference image as the reason for a colour value is a defect, recorded as
BUG-0006. Colour, gradient, motion and copy style all come from the spec: the references use
a lime accent, soft gradients, tinted callouts, multi-hue chart ramps and Title Case, all of
which Actio bans. The full adopt, adapt and reject table, the smoothness doctrine `ref-06`
produces and the `ref-04` test are in
[`actio-design-system`](./.claude/skills/actio-design-system/SKILL.md).

**Where a vendored skill and `BRAND.md` disagree, `BRAND.md` wins** and the override is
recorded. Several taste skills optimise for premium, decorative aesthetics that Actio bans
outright: gradients, glow, heavy shadows, glassmorphism, decorative motion. They are used
for compositional rigour, hierarchy and anti-generic layout, never for their decorative
vocabulary. The per-skill verdicts are in
[`.claude/skills/actio-brand-guard/SKILL.md`](./.claude/skills/actio-brand-guard/SKILL.md).

---

## Working in this repository

- The agents work autonomously. Do not ask permission to run the loop. Ask only for
  decisions that are genuinely the Product Lead's.
- Start any substantial change by invoking `orchestrator`. It builds the run plan and
  dispatches. Do not hand work straight to a maker and skip the gates.
- Small, self-contained changes may go directly to the responsible agent, but the
  orchestrator still records the run and runs the utilisation check at the end.
- Brand assets live in `logo/`. Never redraw the seal. The arcs are mathematically defined
  and an eyeballed version reads as wrong beside a correct one.
- Product code has not started. The specification, the brand and the team are what exist.
