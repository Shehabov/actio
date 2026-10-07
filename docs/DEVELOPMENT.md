# Development

How to run, test and extend Actio on your machine, and how to ship a feature with the agent team. What the product is: [`README.md`](../README.md). The rules every change keeps: [`CLAUDE.md`](../CLAUDE.md).

---

## Prerequisites

- **Node 24 and npm.** The root `package.json` requires `node >=24`.
- **git.**
- **Claude Code**, to run the agent team.

Nothing else may be assumed. The swarm does not use Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql or jq, and a missing tool is reported as blocked, never faked. The full statement is [`CLAUDE.md`, Toolchain](../CLAUDE.md#toolchain).

[`.mcp.json`](../.mcp.json) registers three MCP servers: Supabase (scoped to one project), Playwright and Vercel. Authorise the Supabase one with `/mcp` the first time (see [the database](#the-database)).

## Install

```
npm install
```

Run it once, at the repository root. `web/` and `extension/` are npm workspaces with one lockfile and exact version pins ([ADR-0002](./architecture/adr/ADR-0002-web-foundation.md)), so never install inside a workspace.

## Root commands

| Command | What it runs |
|---|---|
| `npm run dev -w web` | The web app in development, at `http://localhost:3000` |
| `npm run build -ws --if-present` | `build` in `web/` and `extension/` |
| `npm run lint -ws --if-present` | `lint` in both |
| `npm run typecheck -ws --if-present` | `typecheck` in both |
| `npm test` | `test` (Vitest) in both |
| `npm run e2e -ws --if-present` | `e2e` (Playwright) in both |
| `node .actio/bin/verify.mjs` | `node .actio/bin/verify.mjs`: lint, typecheck, test and build once, with logs |
| `npm run db:test` | `node .actio/bin/db-test.mjs`: the offline database proof |

The root scripts only delegate. The command lines live in each workspace's `package.json`, and a single script runs with `npm run <name> --workspace web` or `--workspace extension`.

## The web app

`web/` is Next.js (App Router), React and TypeScript. Its scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` and `e2e`.

- **Environment.** Copy `web/.env.example` to `web/.env.local` and fill the two variables, the project URL and the publishable key. Read both through the Supabase MCP. `.env.local` is git-ignored, and a secret key never goes in `web/`.
- **Where things are.** Routes in `web/src/app/`, the Supabase client helpers in `web/src/lib/supabase/` (`env.ts`, `browser.ts`, `server.ts`), end-to-end specs in `web/e2e/`. There are no screens yet.

## The extension

`extension/` is a Manifest V3 Chrome extension in React and TypeScript, built with Vite, for the desktop roles only ([ADR-0003](./architecture/adr/ADR-0003-extension-foundation.md)). Its scripts: `build`, `lint`, `typecheck`, `test` and `e2e`. It has no `dev` script, because a watch build never exits.

To load it:

1. `npm run build -w extension`, which writes `extension/dist/`.
2. Open `chrome://extensions` and turn on Developer mode.
3. Choose Load unpacked and pick `extension/dist`.
4. After a change, rebuild and press reload on the extension.

The manifest is `extension/public/manifest.json`, copied into `dist/` unchanged.

## Tests

- **Unit.** `npm test`. Vitest, with the test files beside the code (`*.test.ts`).
- **End to end.** `npm run e2e -ws --if-present`. Playwright, from the committed suite. Install its browser once: `npx playwright install chromium`.
- **The web matrix.** `web/playwright.config.ts` generates one project per width, theme and locale: 320, 360, 768, 1024 and 1440, light and dark, `en` and `ar`, named like `360-dark-ar`. The two phone widths use the Moto G4 device profile. Run one project with `npm run e2e -w web -- --project 360-dark-ar`. The suite builds and starts the production server on port 3000 and fails if something already holds the port.
- **The extension.** Its smoke test builds the extension and loads it in Playwright's chromium, because branded Chrome 137 and later ignores `--load-extension`.
- **Evidence.** Screenshots for every gate come from the committed suite. The Playwright MCP is for exploration and reproduction. Contrast is computed from the `BRAND.md` hex values in a node script, never estimated. The doctrine is [`actio-test-protocol`](../.claude/skills/actio-test-protocol/SKILL.md).
- **One pass.** `node .actio/bin/verify.mjs` runs lint, typecheck, test and build once per tree and records the logs, so nothing is rebuilt twice. Flags: `--e2e` to add the end-to-end suite, `--only web,extension,db` to narrow it, `--force` to run again. It never installs anything.

## The database

The source of record is migration files in `supabase/migrations/`, applied and proved through the Supabase MCP, never from SQL that is not in a file. The layout and rules are in [`supabase/README.md`](../supabase/README.md), and the workflow is [`actio-supabase`](../.claude/skills/actio-supabase/SKILL.md).

- **Offline.** `npm run db:test` runs the migrations, the seed and the pgTAP tests on PGlite, in memory, with no Docker. Flags: `--only <test file>`, `--reverse <sql file>` and `--json`. It exits 2 while there is no migration to prove. Its output is labelled PGlite and is evidence of that, not of the project.
- **On the project.** Migrations are applied through the MCP, checked with `list_migrations`, and `get_advisors` must read clean. Only `release-engineer` releases.
- **If the MCP is silent.** Run `/mcp` to authorise the Supabase server. Until then an agent runs the offline proof and hands off `blocked` with `supabase MCP not authorised`, and the orchestrator escalates to you.
- **Hosting** waits until you choose a target. It is recorded as `deferred: no target chosen`, which is not a gate failure.

## Ship a feature with the swarm

1. **Start.** Open a terminal in the repository and run `claude`. `.claude/settings.json` makes the orchestrator the main agent, so you talk to it.
2. **Write the brief.** Plain words: who needs what, on which surface, and anything that must not change. Say if it needs both the interface and the database. You do not name agents or stages.
3. **The lane.** The orchestrator opens the run (`node .actio/bin/run.mjs open`), picks a lane from the files the change will touch and writes the reason down. You can override it.

   | Lane | When |
   |---|---|
   | `micro` | Docs, agent definitions, skills and config. Nothing under `web/`, `extension/`, `supabase/` or `.actio/bin/` |
   | `standard-ui` | `web/` or `extension/`, nothing under `supabase/` |
   | `standard-db` | `supabase/`, nothing under `web/` or `extension/` |
   | `full` | Both, or anything touching the privacy invariants, RLS, grants, auth, the issue state machine or evidence closure |

4. **During the run.** The orchestrator asks the scripts what is due, dispatches every due stage together and waits. Each agent returns at most eight lines. A gate that fails sends the work back to its maker with a reason. When a decision is yours (scope, a brand rule that would have to break, two gates that disagree, a loop that runs three times), it reaches you as the decision, the options and a recommendation. `node .actio/bin/run.mjs next` prints where the run stands.
5. **Records.** Everything lives in `.actio/runs/<yyyy-mm-dd>-<slug>/`, which is git-ignored: `run.json` (the plan and gates), `ledger.md` (every dispatch and return), `report.md`, `<agent>/handoff.json` beside each agent's deliverables, and `evidence/` (screenshots, logs, test output). Usage limits can cut a run short, and a resumed agent continues from its own `working` handoff.
6. **Accept.** Read `report.md`. You alone accept a release, change scope or overrule a gate. `release-engineer` is the only role that commits, tags and pushes.

The delivery flow, the gates and the lanes in full: [`WORKFLOW.md`](./WORKFLOW.md). The agents and the escalation ladder: [`TEAM.md`](./TEAM.md).

## Conventions

- **No AI attribution anywhere.** No commit, tag, pull request, release note, code comment or document carries a co-author line, a generated-by line or any mention of the tool that wrote it.
- **English and Arabic in the same run.** Arabic is written, never translated, and marked `needs native review` until a native speaker has read it on a physical device.
- **Every width.** Phone to desktop, both orientations and 200% zoom, with a screenshot each at 320, 360, 768, 1024 and 1440.
- **Evidence.** Nothing is marked done without it, and nothing closes in the product without it.
- **Brand.** Colour, spacing, radius, duration and type size come from [`BRAND.md`](../BRAND.md) and nowhere else.
- **History.** [`BUGS.md`](../BUGS.md) holds every defect and the standing rule it produced. Only `bug-historian` writes to it, and each agent is briefed with the entries for its surfaces before it plans.
- **Code.** Exact dependency pins, no `overrides`, and the standards in [`actio-clean-code`](../.claude/skills/actio-clean-code/SKILL.md).
