<div align="center">

<img src="./logo/social/og-image-1200x630.svg" alt="Actio. Feedback that closes. A Lumofy product." width="840">

# Actio

**The accountability layer for engagement and culture surveys.**

Actio routes employee feedback to whoever can actually fix it, and does not let it close without proof.

<p>
<img src="https://img.shields.io/badge/Status-foundation-017E85?style=for-the-badge&labelColor=0C0C0C" alt="Status: foundation">
<img src="https://img.shields.io/badge/Product-coming_soon-0C0C0C?style=for-the-badge&labelColor=0C0C0C" alt="Product coming soon">
<img src="https://img.shields.io/badge/Team-16_agents-017E85?style=for-the-badge&labelColor=0C0C0C" alt="16 agents">
<img src="https://img.shields.io/badge/A_Lumofy-product-017E85?style=for-the-badge&labelColor=0C0C0C" alt="A Lumofy product">
</p>

</div>

---

## What Actio is

When an employee tells their employer something is wrong, a named person fixes it and the employee is told what happened.

Organisations collect feedback well and act on it badly. Around two thirds of employees believe nothing happens after a survey. Participation falls, the data degrades, and each round is worth less than the last.

| | |
|---|---|
| **65%** | of employees say nothing happens after a survey |
| **41%** | actual response rate at 1,000 to 5,000 employees |
| **37%** | have seen change since the previous survey |

### What the product does

Actio classifies every issue by who has the authority to change it, assigns it to a named owner with a date, and holds it open until evidence of the change is attached. Then the employee is told what happened.

| Today | With Actio |
|---|---|
| Survey | Survey |
| Dashboard | Route by authority |
| Deck | Named owner and date |
| Nothing | Evidence attached |
| | Employee told |

Routing is the product. A team lead cannot change pay bands, shift rotation or career structure, so sending those findings to that person guarantees they are not fixed and teaches the workforce that answering is pointless. Actio separates what a manager can solve from what operations, leadership or a protected case channel must solve, and tracks each to closure separately.

| Routing lane | Owns |
|---|---|
| Team lead | Workload, one to ones |
| Operations | Rosters, staffing |
| Leadership | Pay, career, policy |
| Protected | Misconduct and safety, handled as a case outside the queue |

Two rules are designed to hold in the database, not in the interface, so they survive a leaked key:

- **Nothing closes without evidence.** Closure is a guarded state transition, not a convention.
- **Small groups never report.** No group below the reporting threshold of 5 ever reports and a manager cannot filter below it. Free text comes back reworded with names removed, and protected cases leave the engagement queue entirely.

### Who uses it, and how it is measured

The users are the frontline employee, the team lead, operations, and the site director or COO. The buyer is operations, not the user: Actio is sold to operations as retention infrastructure, not to HR as a culture programme.

It is built for high-attrition frontline operations in Southeast Asia. It works over WhatsApp, SMS and web, in Bahasa Indonesia, English and Tagalog, with Arabic (right to left) inherited from Lumofy. The reader is usually on a phone, often in a second language, often mid-shift, and is deciding whether honesty carries a cost. The extension serves the desktop roles only.

**Measured on** first-90-day attrition, closure rate and median days to close. Never a sentiment score.

---

## Status

Actio is at the foundation stage. The ground is laid and the first feature is the next run.

| Area | Today |
|---|---|
| Brand | Done. The spec ([`BRAND.md`](./BRAND.md)), the guidelines PDF, and the seal and lockups in [`logo/`](./logo/) |
| Agent team | Done. Sixteen agents, twelve gates, four lanes, a run ledger and a defect register |
| Web app | Foundation. Next.js 16 App Router, React 19, TypeScript 6, the Supabase client helpers, Vitest and a Playwright suite across five widths, both themes and both locales ([ADR-0002](./docs/architecture/adr/ADR-0002-web-foundation.md)). No screens yet |
| Extension | Foundation. A Manifest V3 extension built with Vite that Chrome loads, with a smoke test ([ADR-0003](./docs/architecture/adr/ADR-0003-extension-foundation.md)). No surface yet |
| Database | Not started. No migrations yet. The layout is in [`supabase/README.md`](./supabase/README.md), and `npm run db:test` is ready to prove them offline |
| Channels and strings | Not started. WhatsApp, SMS, and the English and Arabic string catalogue |

---

## Develop

You need Node 24 and npm. Nothing else is required to run the code.

```
npm install              # installs web/ and extension/ together
npm run dev -w web              # the web app, at http://localhost:3000
npm run build -ws --if-present            # builds web/ and extension/
npm run lint -ws --if-present
npm run typecheck -ws --if-present
npm test                 # unit tests, web/ and extension/
npm run e2e -ws --if-present              # Playwright. Run `npx playwright install chromium` once first
npm run db:test          # the offline database proof (PGlite, no Docker)
node .actio/bin/verify.mjs           # lint, typecheck, test and build once, with logs
```

To try the extension: `npm run build -w extension`, open `chrome://extensions`, turn on Developer mode, choose Load unpacked and pick `extension/dist`.

Environment, the database, the test matrix and the conventions are in [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md).

---

## Build features with the agent team

Actio is built by sixteen agents under one human Product Lead, Shehab Beram. He sets the brief, and he alone changes scope, accepts a release or overrules a gate.

1. Open `claude` in this repository. The orchestrator is the main agent.
2. Give it a brief in plain words: who needs what, and where.
3. It opens a run, picks a lane from the files the change touches (`micro`, `standard-ui`, `standard-db` or `full`), and dispatches only the agents that lane needs. Designers, writers, engineers, four independent reviewers, QC and release each hand work on through a gate. The orchestrator is the only dispatcher.
4. Every run leaves its plan, evidence and verdicts in `.actio/runs/<run-id>/`. You read the report and accept or send it back.

<div align="center">
<img src="./docs/diagrams/actio-run-v2.svg" alt="How an Actio run moves: ten stages left to right with the five stage-5 checks running in parallel, the orchestrator's four-call routine between stages, the loop inside every agent, the four lanes, and the measured baseline of seven runs (804M tokens, 52.5 of 75.5 hours locked out by spend limits). The baseline is measured; the caps are targets, not results." width="900">
</div>

The two-minute walkthrough is [How a run moves](./docs/WORKFLOW.md#how-a-run-moves). The org, the models and the escalation ladder are in [`docs/TEAM.md`](./docs/TEAM.md). The working steps are in [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md#ship-a-feature-with-the-swarm).

---

## Brand

[`BRAND.md`](./BRAND.md) is the machine-readable brand spec: tokens, contrast, type, components and copy rules. It is binding on every role, and it wins over any design instinct or vendored skill. Never invent a colour, spacing value, radius, duration or type size: if the value is not in `BRAND.md`, the design is wrong, not the scale.

[`Actio-Brand-Guidelines-v1.pdf`](./Actio-Brand-Guidelines-v1.pdf) carries the same rules for people, with the reasoning. The four v1.5 amendments are in `BRAND.md` and not yet in the PDF. The marks live in [`logo/`](./logo/), and [`logo/README.md`](./logo/README.md) says which file to use where. Never redraw the seal: its arcs are mathematically defined. The seven design references behind the platform shape are in [`docs/design-reference/`](./docs/design-reference/).

---

## Repository map

| Path | What it is |
|---|---|
| [`web/`](./web/) | The Next.js App Router app, TypeScript, npm |
| [`extension/`](./extension/) | The Manifest V3 Chrome extension, React and TypeScript, built with Vite |
| [`supabase/`](./supabase/) | The database source of record: migrations, pgTAP tests, Edge Functions, seed. The folders land with the first back-end run |
| [`docs/`](./docs/) | The index is [`docs/README.md`](./docs/README.md): development guide, workflow, team, ADRs, design references |
| [`BRAND.md`](./BRAND.md), [`logo/`](./logo/) | The brand spec and the marks |
| [`CLAUDE.md`](./CLAUDE.md), [`BUGS.md`](./BUGS.md) | The operating manual every agent loads, and the defect register with its standing rules |
| [`.claude/`](./.claude/) | The sixteen agents, fifteen house skills and twenty-two vendored ones |
| [`.actio/`](./.actio/) | The run scripts, lane templates and, once runs happen, their records |
| `.mcp.json` | The MCP servers: Supabase (one project), Playwright and Vercel |
| `package.json` | Private, npm workspaces `["web", "extension"]`, the root scripts above |

`content/strings/` (the English and Arabic catalogue) and `design/surfaces/` (the design spec for each surface) are created by the first feature run.

---

## Roadmap

| # | Step | State |
|---|---|---|
| 1 | Specification: `BRAND.md`, the guidelines, the marks | Done |
| 2 | The team: 16 agents, 15 house skills, the run ledger, the defect register | Done |
| 3 | The `web/` and `extension/` foundations | Done |
| 4 | Tokens as CSS custom properties, Tailwind config and native resources | Next |
| 5 | Source Sans 3, IBM Plex Sans, Mono and Sans Arabic self-hosted as WOFF2 | Next |
| 6 | Contrast check running in continuous integration | Next |
| 7 | Components: button, input, select, status pill, card, table row, empty state, toast, modal, nav shell | Not started |
| 8 | Channels: WhatsApp utility templates, employee update, manager assignment email, SMS fallback | Not started |
| 9 | Dark mode and all four locales verified on a real handset | Not started |

`BRAND.md` and the guidelines PDF are versioned together. A change to one without the other is a defect.

---

## Licence and trademark

Proprietary. See [LICENSE](./LICENSE).

Third parties may use the horizontal lockup unmodified, with correct clear space, to state that their product integrates with Lumofy Actio, and where a mark is reproduced the accompanying text reads: *Actio and the Actio seal are marks of Lumofy.* Use of the seal alone, incorporation of the name into another product name or domain, modification of any mark, and application to merchandise are not permitted.

<div align="center">
<br>
<img src="./logo/svg/mark/seal-vega.svg" alt="" width="28">
<br><br>
<sub><b>Actio</b>, a product of <a href="https://lumofy.com">Lumofy</a>. Built by <a href="https://www.shehabberam.com/">Shehab Beram</a>.</sub>
</div>
