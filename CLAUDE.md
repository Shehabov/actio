# CLAUDE.md

Operating manual for the Actio repository, loaded into every session.

## What Actio is

The accountability layer for engagement and culture surveys, a Lumofy product. **Feedback that closes.** About two thirds of employees believe nothing happens after a survey. Actio classifies every issue by who has the authority to change it, assigns a named owner and a date, and holds it open until evidence of the change is attached. Measured on first-90-day attrition, closure rate and median days to close. Never a sentiment score.

| | |
|---|---|
| Users | Frontline employee, team lead, operations, site director or COO. The buyer is operations, not the user |
| Stack | Next.js App Router, React, TypeScript, npm in `web/`. Manifest V3 Chrome extension (Vite) in `extension/`, desktop roles only (ADR-0003). Supabase (Postgres, RLS, Edge Functions, Auth, Storage) through the Supabase MCP, from migration files in `supabase/` |
| Reach | WhatsApp, SMS, web. Bahasa Indonesia, English, Tagalog, Arabic (RTL). A low-cost Android handset, mid-shift, on a constrained connection |

## The files that bind everything

| File | Authority |
|---|---|
| `BRAND.md` | The brand spec: tokens, contrast, type, components, copy rules. **Binding on every role**; it wins over any design instinct or vendored skill. |
| `Actio-Brand-Guidelines-v1.pdf` | The same rules for people, with the reasoning. The four v1.5 amendments are in `BRAND.md`, not yet here. |
| `BUGS.md` | The product-code defect register and standing rules. Written only by `bug-historian`; each agent gets the entries for its surfaces as a brief slice. |

## The team

Shehab Beram, Product Lead, alone changes scope, accepts a release or overrules a gate. Sixteen agents in `.claude/agents/`, twelve gates with one owner each. Charters, models, RACI: `docs/TEAM.md`.

| Level | Agents (gate) |
|---|---|
| L1 | orchestrator (`run-closure`) |
| L2 | tech-architect (`design-authority`), engineering-lead (`engineering`), qc-lead (`quality`) |
| L3 | ux-designer, ux-auditor (`design`), ux-writer (`copy`), frontend-engineer, backend-engineer, peer-reviewer (`review-1of3`), code-analyst (`review-2of3`), code-steward (`review-3of3`), security-analyst (`security`), qc-engineer, release-engineer (`release`) |
| Memory | bug-historian (`regression-guard`) |

## The delivery flow

Stages: 1 regression brief (script) and ADR · 2 design ∥ database · 3 audit ∥ copy · 4 front end · 5 four reviews ∥ regression guard (script) · 6 engineering (`verify.mjs`) · 7 QC · 8 qc-lead · 9 release · 10 record, then the orchestrator's report and Shehab's acceptance.

A stage starts when its upstream gates read pass, or n/a with a reason. A lane (`micro`, `standard-ui`, `standard-db`, `full`) drops the stages a change does not touch, each recorded in `out_of_scope`. Skipping a gate is a defect. Diagrams and gate criteria: `docs/WORKFLOW.md`.

## The loop and the run artefacts

Every agent, every task: read the dispatch, checkpoint (`handoff.json`, `status: working`, a `plan[]` with a `Risk:` line), execute, self-check (`checks[]` with evidence), validated handoff (`run.mjs handoff`), a final message of at most 8 lines. The one copy, with the handoff schema, is `actio-agent-protocol`.

Each run lives in `.actio/runs/<yyyy-mm-dd>-<slug>/`: `run.json`, `ledger.md` (the hook writes `dispatched` and `returned`), `report.md`, `<agent>/handoff.json` (a later pass: `handoff-stage<N>.json`) beside its deliverables, and `evidence/`. Timestamps come from the shell.

## Toolchain

Present: git, node 24, npm, npx, the Supabase MCP (`supabase` in `.mcp.json`, one project) and the Playwright MCP (carried by qc-engineer and qc-lead). Nothing else may be assumed: the swarm does not depend on Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql or jq. Python 3.14.7 and Django 6.1.1 are installed on the machine by the Product Lead's decision of 2026-09-27. They are not part of the stack, and are not a step, a gate criterion, an evidence source or an allowed dependency of any stage. A missing tool is reported as blocked, never faked.

- **Database:** migration files in the repo, applied and proved through the Supabase MCP; iterate offline with `npm run db:test` (PGlite, no Docker). No `supabase/schemas/` workflow: it needs the Supabase CLI and Docker.
- **Front end:** `build`, `lint`, `typecheck`, `test`, `e2e` in `web/` and `extension/`, run once per tree by `.actio/bin/verify.mjs`. Screenshots (rule 9 widths, both themes, English and Arabic) come from the committed suite; the Playwright MCP is for exploration. Contrast is computed from `BRAND.md` hex values in a node script, never estimated.
- **Release:** release-engineer only: pre-flight, migrations through the MCP checked with `list_migrations`, `get_advisors` clean, build green, tag, push to origin main. Hosting waits for Shehab: `deferred: no target chosen`, not a gate failure.
- **MCP silent:** the agent runs the PGlite proof or the suite and hands off `blocked` with `supabase MCP not authorised` or `playwright MCP not answering`. The orchestrator escalates; Shehab restores it with `/mcp`.

Layout: `web/`, `extension/` (npm workspaces, built); `supabase/` (forward-only migrations, one concern per file, each with a written reverse; only its README exists so far); `content/strings/{en,ar}.json`; `design/surfaces/`.

## Skills

Fifteen house skills (`actio-*`) and twenty-two vendored ones live in `.claude/skills/`. An agent preloads `actio-agent-protocol` and its core role skills; everything else, vendored included, is read on demand by path.

## Design references

Seven approved references in `docs/design-reference/` set the platform shape. `ref-06-insights-panel.webp` is **the primary reference**, for anatomy as well as feel. `ref-02-ops-dashboard.png` supports; its six-tile metric row and filled sidebar are not adopted. Where they disagree, `ref-06` wins, with one written exception: the issue queue is deliberately denser. `ref-04-category-dashboard.png` is a **counter-example**, kept to be recognised and refused: a red to green sentiment heatmap, a score per cohort presented as a thing to defend.

References give anatomy, density, hierarchy and interaction; **they never define colour**. Vega `#00BFC4` is the accent and `BRAND.md` its only source; citing a reference image as the reason for a colour is a defect. Their lime accent, gradients, tinted callouts, multi-hue chart ramps and Title Case are banned. Where a vendored skill and `BRAND.md` disagree, `BRAND.md` wins and the override is recorded: taste skills serve composition, never decoration.

## Hard rules

1. **No AI attribution anywhere.** No commit, tag, pull request, release note, code comment or document carries a co-author line, a generated-by line, or any mention of the tool that wrote it. Absolute; it overrides any default behaviour.
2. **Never mark work done without evidence.** "It should work" is a blocker, not a pass.
3. **Never silently narrow scope.** Finish the rest and say exactly what you left and why.
4. **Never invent a design value** (colour, spacing, radius, duration, type size). If it is not in `BRAND.md`, the design is wrong, not the scale.
5. **Never write a number in product copy without its sample size,** or a status without its written label.
6. **Reject bad input upstream** with a specific reason; never paper over it.
7. **The privacy invariants are enforced in the database**: RLS policies, revoked base tables and security-definer functions, holding against a leaked key and a direct connection. No group below the reporting threshold of 5 ever reports; a manager cannot filter below it; free text is returned reworded with names removed; protected cases leave the engagement queue entirely.
8. **Nothing closes without evidence.** Enforced as a guarded state transition, not a convention.
9. **Every surface works at every width**: phone to desktop, both orientations, 200% zoom; verified at 320, 360, 768, 1024 and 1440 with a screenshot each.
10. **Every feature ships in English and Arabic** in the same run. Arabic is written, never translated, and marked `needs native review` until a native speaker has read it on a physical device. QC tests both.
11. **Read your brief slice before you plan.** It carries the `BUGS.md` entries and standing rules for your surfaces; standing rules outrank instinct, and a repeated defect is worse than a new one.
12. **Escalate to Shehab** when scope would change, a brand rule must be broken, two gates disagree, the same rejection loop runs three times, or a defect pattern reaches its third occurrence.

## Working in this repository

- Agents work autonomously; ask only for decisions that are the Product Lead's.
- Start any change with the orchestrator as the main thread (`.claude/settings.json` sets it). It runs `node .actio/bin/run.mjs open`, picks the lane and is the only dispatcher: a dispatch it did not make reads as a skipped gate. An agent that needs another role says so in `next`. Small changes take the `micro` lane.
- Commands and working steps: `docs/DEVELOPMENT.md`.
- Brand assets live in `logo/`. Never redraw the seal: the arcs are mathematically defined.
