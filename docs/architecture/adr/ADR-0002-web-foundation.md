# ADR-0002 · The web/ foundation: versions, scaffold, test harness and the Supabase client contract

- **Status.** Accepted
- **Date.** 2026-09-27
- **Run.** 2026-09-27-dev-setup
- **Invariants touched.** None is enforced here, and none may be. This is the ground that I1 to I8
  will be served from, and the boundaries in decision 10 keep it that way.
- **Follows.** ADR-0001, the site insights read path, at
  `.actio/runs/2026-09-22-site-insights/tech-architect/adr-0001-site-insights.md`. That run
  directory holds a second file numbered 0001, `adr-0001-site-insights-reporting-threshold.md`.
  It is a pointer to the first and carries no decision. ADR-0001 has not been promoted to this
  directory. It exists only in the gitignored run directory, so this is the first ADR on the
  committed record. Promoting ADR-0001 unchanged belongs to `2026-09-22-site-insights`.
- **Supersedes.** none
- **Superseded by.** none
- **Product Lead decisions.** Two, both taken on 2026-09-27 when Shehab answered "go with the
  recommended approach", and recorded against this ADR in the run ledger at 22:36:18Z: the
  TypeScript and ESLint pins in decision 1, and Next.js telemetry off, which is decision 11.

---

## Context

`web/` does not exist. The stack is fixed in `CLAUDE.md`: Next.js App Router, TypeScript and npm
in `web/`, Supabase behind it. The Product Lead asked for the latest React and TypeScript. This
run ships no surface and no product string (run.json out_of_scope 1, done_means 7). It does not
reach the Supabase project either, because the MCP is not authorised (pre-flight section 3).

The forces, all measured this run rather than recalled:

- **The registry.** The latest releases are in `evidence/toolchain-preflight.log` section 6 and
  `evidence/tech-architect/registry-facts.txt`.
- **The lint stack sits behind the latest TypeScript and ESLint.** eslint-config-next 16.3.6
  depends on typescript-eslint `^8.46.0`, and its latest release, 8.70.1, declares TypeScript
  `>=4.8.4 <6.1.0`. typescript 7.0.2 exports no JavaScript compiler API: its `"."` export is
  `./lib/version.cjs`. eslint-config-next also depends on eslint-plugin-react, eslint-plugin-import
  and eslint-plugin-jsx-a11y, whose latest releases declare ESLint up to 9
  (`evidence/regression/stage1-peer-ranges.txt`).
- **Next's own TypeScript support.** Next.js 16.3 type-checks during `next build` by running the
  project-local `tsc`. Its documentation says this path "supports TypeScript 6 and enables
  TypeScript 7 while its JavaScript API is unavailable", and it marks the option,
  `experimental.useTypeScriptCli`, as experimental while leaving it on by default. So Next itself
  accepts TypeScript 7, and the lint stack does not.
- **create-next-app 16.3.6 writes agent files by default.** Its `--agents-md` default writes
  `AGENTS.md` and a `CLAUDE.md` containing `@AGENTS.md`. `next dev` on 16.3 writes the same pair
  whenever it detects a coding agent, unless `agentRules` is `false`. Every agent in this swarm
  is one, so the files would land.
- **The generated layout types its props with a global Next generates.** It uses `LayoutProps`,
  which exists only after `next typegen`, `next dev` or `next build`. `next-env.d.ts` is
  gitignored, so `tsc --noEmit` on a fresh clone would fail.
- **This machine.** npm runs scripts under cmd.exe. The Bash tool has no working heredoc, and it
  collapses doubled backslashes (regression brief, facts 2 and 4).
- **The toolchain.** It is the one under Toolchain in `CLAUDE.md`: git, node 24, npm, npx, and
  the Supabase and Playwright MCP servers. Python 3.14.7 and Django 6.1.1 are installed on the
  machine by the Product Lead's decision of 2026-09-27. They are not part of the stack, and are not
  a step, a gate criterion, an evidence source or an allowed dependency of any stage. Nothing in
  this ADR uses them.

Every command below was run once in a scratch mirror of the workspace outside the repository:
a root `package.json` with `workspaces: ["web"]`, and `web/` created by the command in decision 3.
The output is under `.actio/runs/2026-09-27-dev-setup/evidence/tech-architect/`, and each file
opens with a line saying where it ran. The mirror is not the deliverable. frontend-engineer
builds `web/` in the repository from the brief.

---

## Decision 1 · Versions

### The pin table

This table is the source for the pins in this run. `web/package.json` and the root
`package.json` must equal it entry for entry, with nothing added and nothing missing. The first
column matches the manifest and the section inside it, so a node command can diff the two
(brief-frontend, step 20). "Latest" is the registry `latest` tag, read on 2026-09-27.

| Manifest and section | Package | Pin | Registry latest | Is the pin the latest? |
|---|---|---|---|---|
| web dependencies | next | 16.3.6 | 16.3.6 | yes |
| web dependencies | react | 19.3.0 | 19.3.0 | yes |
| web dependencies | react-dom | 19.3.0 | 19.3.0 | yes |
| web dependencies | @supabase/supabase-js | 2.117.2 | 2.117.2 | yes |
| web dependencies | @supabase/ssr | 0.12.7 | 0.12.7 | yes |
| web devDependencies | typescript | 6.0.3 | 7.0.2 | no, one major below: the latest the whole stack declares |
| web devDependencies | eslint | 9.39.5 | 10.11.0 | no, one major below: the latest the lint plugins accept |
| web devDependencies | eslint-config-next | 16.3.6 | 16.3.6 | yes, and equal to next |
| web devDependencies | @types/node | 24.19.0 | 26.6.3 | no: the latest for Node 24, the lowest runtime the root engines field admits |
| web devDependencies | @types/react | 19.3.0 | 19.3.0 | yes |
| web devDependencies | @types/react-dom | 19.3.0 | 19.3.0 | yes |
| web devDependencies | vitest | 5.0.2 | 5.0.2 | yes |
| web devDependencies | @playwright/test | 1.63.0 | 1.63.0 | yes |
| root devDependencies | @electric-sql/pglite | 0.5.8 | 0.5.8 | yes, and already what the root lockfile resolves |

The table has 14 entries: 5 web dependencies, 8 web devDependencies and 1 root devDependency.
Count them again with the diff command in brief-frontend step 20, which prints the number it
compared.

**Not installed:** `tailwindcss`, latest 4.3.3 (decision 4). **Resolved by the lockfile, not
pinned in a manifest:** every transitive package. That includes `vite` 8.3.1, which vitest
declares as a required peer and npm installs.

**Said plainly:** React is the latest. TypeScript is pinned at 6.0.3, one major below the
latest 7.0.2, and ESLint at 9.39.5, one major below 10.11.0. Both are "the latest the stack
supports", not "the latest". The reasons follow.

**Decided by Shehab on 2026-09-27.** He accepted the recommendation: TypeScript 6.0.3 and
ESLint 9.39.5, the latest the whole stack supports, with React at the latest, 19.3.0. The pins
above are therefore his decision as well as this ADR's. Moving either to its next major is a new
ADR, on the triggers under "What would make us revisit".

### TypeScript

| Option | Consequence |
|---|---|
| 7.0.2, the latest | Rejected. It installs, and typecheck, lint and build all exit 0 in the mirror. They pass only because npm quietly keeps TypeScript 6.0.3 at the root to satisfy typescript-eslint, while 7.0.2 sits in `web/` (`ts7-two-compilers.txt`). The project would run two compilers. `tsc` and `next build` would check with one. The linter would parse with the other, a version no manifest names and only the lockfile chooses. That is that shape in the toolchain itself. Once 7.x adds syntax that 6.0 cannot parse, lint would fail or misread it. 7.0.2 also carries no compiler API, so the Next.js editor plugin cannot load it. And Next reaches 7 only through an option its own docs call experimental |
| 7.0.2 with 6.0.3 pinned beside it under an alias | Rejected. It declares the two compilers instead of hiding them, but there would still be two |
| **6.0.3** | **Chosen.** It is the latest release that every package in the stack declares support for. One compiler serves `tsc`, `next build` and the linter (`install.txt`, `npm-ls-healthy.txt`). `@types/react` publishes its `ts6.0` tag at 19.3.0. TypeScript 6.0 is the last JavaScript-based release, built as the bridge to 7.0, so moving later is a pin change, re-proved by the same commands |

TypeScript 6.0 changes two defaults that this scaffold meets. `types` now defaults to `[]`, so
`web/tsconfig.json` names `"types": ["node"]` rather than relying on a transitive reference
(`typecheck-types-node.txt`). `noUncheckedSideEffectImports` now defaults to `true`, so a side-effect
import of a file that does not resolve fails the check. `next build` leaves `tsconfig.json`
unchanged with `types` added (`build-types-node.txt`).

### ESLint

| Option | Consequence |
|---|---|
| 10.11.0, the latest | Rejected, measured. npm installs it and keeps 9.39.5 for the plugins. Then `npm run lint` exits 2 with `Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function` (`eslint10-lint.txt`), because eslint-plugin-react 7.37.5 calls an API that ESLint 10 removed |
| Biome, through create-next-app's `--biome` | Rejected. `frontend-engineer.md` and `actio-architecture` name ESLint as the lint script. Changing the linter drops the Next.js core-web-vitals rules, and it is a machinery change that belongs in its own run |
| **9.39.5** | **Chosen.** It is the latest 9.x, and lint exits 0 on it (`lint.txt`, having read all 11 files in `lint-files.txt`). **Cost, stated:** the registry marks 9.39.5 deprecated, "This version is no longer supported", and `npm install` prints that warning. ESLint is a development tool. It never reaches a browser or the Supabase project, so its exposure is the developer machine. security-analyst accepts that in writing or fails it |

### @types/node

24.19.0, the latest 24.x. The root `engines` field is `node >=24`, and the machine runs v24.15.0.
Types for 26.6.3 describe APIs that Node 24 does not have. Typing against the lowest runtime the
workspace admits means code cannot call an API the runtime lacks.

---

## Decision 2 · Pinning policy

- **Exact versions for every direct dependency, in both manifests.** Both `web/package.json` and
  the root `package.json` follow this. It is one policy for the workspace. The root's
  `@electric-sql/pglite` moves from `^0.5.8` to `0.5.8`, which the root lockfile already
  resolves, so the change moves nothing.
- **The root `package-lock.json` pins every transitive package, and it is the only lockfile.**
  `npm install` runs at the root and nowhere else.
- **Nothing forced.** No `overrides`, no `.npmrc` relaxation, no `--legacy-peer-deps`, and no
  forced install.
- **After this run releases, the source changes hands.** `web/package.json`, the root
  `package.json` and the lockfile become the source of the current versions, and this table
  becomes the record of where they started. Some changes need their own ADR: moving a package
  across a major version, adding or removing a direct dependency, or taking any package outside
  a range its dependents declare. A patch or minor bump within the same major needs a reviewed
  change carrying its `npm view` output, not an ADR.
- **The detection works as written.** bug-historian's D-11 assumes exact pins, and this policy
  gives it exact pins. The guard should also run the same check over the root `package.json`.

---

## Decision 3 · The create-next-app command

Run from the repository root:

```bash
npx --yes create-next-app@16.3.6 web --yes --ts --app --eslint --src-dir --use-npm --import-alias "@/*" --disable-git --no-tailwind --no-react-compiler --no-agents-md --empty --skip-install
```

| Part | Why |
|---|---|
| `npx --yes` | npx does not stop to ask before downloading the package |
| `@16.3.6` | The exact version, equal to `next`. This overrides the `@latest` in `frontend-engineer.md` line 36 (N-06) |
| `--yes` with every option named | `--yes` fills any option you leave out from preferences saved on the machine. create-next-app keeps eight of those: typescript, app, linter, srcDir, importAlias, tailwind, reactCompiler and agentsMd. All eight are named on this line, so a preference saved by an earlier run cannot change the output |
| `--no-tailwind` | Decision 4 |
| `--no-react-compiler` | It would add `babel-plugin-react-compiler`, a dependency no decision has taken |
| `--no-agents-md` | The default writes `web/AGENTS.md` and `web/CLAUDE.md`. That is a second agent-instructions file, carrying tool text (hard rule 1) |
| `--empty` | The empty template. It never writes the demo page styles, `public/` and its SVGs, the favicon, the `next/font/google` Geist import or a stylesheet |
| `--skip-install` | Without it, the command installs inside `web/` at the template's ranges (react 19.2.8, typescript `^5`, eslint `^9`). The pins are set first, and one install runs at the root |
| `--disable-git` | No nested repository |

Measured output (`cna-run.txt`, `cna-generated-files.txt`): exit 0, "Initializing project with
template: app-empty", "Skipping git initialization.", and exactly 9 files. Those are
`web/.gitignore`, `web/README.md`, `web/eslint.config.mjs`, `web/next.config.ts`,
`web/next-env.d.ts`, `web/package.json`, `web/src/app/layout.tsx`, `web/src/app/page.tsx` and
`web/tsconfig.json`.

---

## Decision 4 · Styling: no Tailwind and no stylesheet in this run

`BRAND.md` §1 and §9 step 1 emit the tokens to CSS custom properties, a Tailwind config and
native resources. README roadmap step 3 says the same. The question is when Tailwind arrives,
not whether the tokens reach it.

| Option | Consequence |
|---|---|
| Tailwind now, as generated | Rejected. Its default theme ships a full colour palette and a spacing, type and radius scale, and none of it is `BRAND.md`'s. The first class anyone writes would carry a value outside the scale (hard rule 4). Its preflight also sets a line height and a font stack |
| Tailwind now, with the default theme cleared | Rejected. Clearing the theme is a token-layer decision taken before the tokens exist. It installs a dependency nothing uses, and security-analyst would audit it for nothing |
| **Not installed now. The tokens run decides it, with the tokens** | **Chosen.** The tokens run takes `BRAND.md` §9 step 1. It decides whether Tailwind is the consumption layer or the CSS custom properties alone are, and it pins the version then |

The scaffold carries no stylesheet at all. There is no `globals.css`, no CSS module, no `style`
attribute and no `className`. With nothing set, `/` renders on the browser's own defaults, which
are not a design decision by Actio. Fonts follow `BRAND.md` §3: self-hosted WOFF2, and never a
public CDN. They land in their own run (README roadmap step 4). `next/font/google` is never
used. `next/font/local` is the candidate mechanism, and the fonts run decides.

---

## Decision 5 · The strip list, and what `/` renders

**Never written, because of `--empty` and `--no-agents-md`:** `src/app/favicon.ico`,
`src/app/globals.css`, `src/app/page.module.css`, `public/file.svg`, `public/globe.svg`,
`public/next.svg`, `public/vercel.svg`, `public/window.svg`, the `next/font/google` Geist import,
`AGENTS.md` and `CLAUDE.md`.

**The fate of each of the 9 files that are written:**

| Generated file | Fate | Why |
|---|---|---|
| `web/.gitignore` | Deleted | Decision 9 |
| `web/README.md` | Deleted | It names create-next-app, the hosting vendor and three package managers this machine does not have (D-01, D-14). It would also be a third place to find the script names |
| `web/next-env.d.ts` | Left alone, never committed | Gitignored at the root, and regenerated by `next dev`, `next build` and `next typegen` |
| `web/package.json` | Edited | Decisions 1, 2 and 6 |
| `web/tsconfig.json` | One edit: `"types": ["node"]` in `compilerOptions` | Decision 1, TypeScript |
| `web/next.config.ts` | Edited | Two options, below, and the telemetry line of decision 11. The template's placeholder comment goes |
| `web/eslint.config.mjs` | Unchanged | It lints all 11 files and exits 0 |
| `web/src/app/layout.tsx` | Rewritten | Three things go. The `metadata` export goes: its title is a product string, and its description is a "generated by" line (hard rule 1). `lang="en"` goes: the language is decided per locale by locale routing, and `en` is wrong for three of the four locales. `LayoutProps<"/">` goes, replaced by an explicit `children` type, so that `tsc --noEmit` passes on a fresh clone |
| `web/src/app/page.tsx` | Rewritten to render nothing | Below |

**`next.config.ts` carries two options, each with a one-line comment saying why:**

- `agentRules: false`. Otherwise `next dev` writes `AGENTS.md` and `CLAUDE.md` into `web/`, and
  the repository keeps one agent-instructions file, at its root.
- `poweredByHeader: false`. The response stops naming the framework to every caller.

It also carries one statement above the config object, the telemetry opt-out, which decision 11
decides.

**What `/` renders.** Measured under a production `next start` in the first mirror, by the probe
of the root document in `evidence/tech-architect/e2e-smoke-fires.txt`:

- Status 200, and `<html>` with no `lang`.
- A `<head>` carrying only the framework's `charset` and `viewport` meta and its own script
  preload, with an empty title.
- A `<body>` whose rendered text is empty.
- No request to any origin but its own.

**Why that is not a surface.** There is nothing a reader can read or operate, and nothing that
tells them anything. No `BRAND.md` value is set or needed. The smoke test asserts it stays that
way. Deleting `page.tsx` would be worse, not better: `/` would then be the framework's not-found
page, English-only text "404 This page could not be found." at the root route. A smoke that
passes against that proves only that the server answered.

**The framework defaults that remain.** An unknown route renders Next's default not-found page:
English text, status 404, measured. A thrown error renders Next's default error page. Both are
reachable only on `localhost`, because hosting is deferred and nothing is deployed. Both are
surfaces, the not-found and error states, and in English and Arabic they belong to ux-designer
and ux-writer. Replacing them with an empty page would be a surface decision taken without the
design track, so this run keeps the defaults. No user-visible element is needed to build the
foundation, so no design role is added to this run.

**The app icon.** None in this run. The approved favicons are in `logo/app-icon/` (`BRAND.md` §4).
Choosing one is ux-designer's decision in the first surface run. A file is copied from `logo/`,
never redrawn and never regenerated.

---

## Decision 6 · Scripts

The script names are already defined in `CLAUDE.md`, under Toolchain, and in `actio-architecture`,
under Repository layout. This ADR adds the command line for each. It adds no name.

| Script | Command | Note |
|---|---|---|
| `dev` | `next dev` | |
| `build` | `next build` | Type-checks with the project-local `tsc` |
| `start` | `next start` | Kept from the template. The e2e web server uses it |
| `lint` | `eslint` | ESLint 9 flat config, `web/eslint.config.mjs` |
| `typecheck` | `tsc --noEmit` | |
| `test` | `vitest run` | `run`, never watch mode, which does not exit |
| `e2e` | `playwright test` | |

- **Where each command runs.** Run a script inside `web/` with `npm run <name>`, or from the
  root with `npm run <name> --workspace web`.
- **No proxy scripts at the root.** A root `build` that calls the workspace's `build` would be
  a second definition of each name. The root keeps its one script, `db:test`.
- **cmd.exe.** None of these commands uses a construct cmd.exe cannot run (D-10).

---

## Decision 7 · The test harness

### Vitest

- **The config file is `web/vitest.config.mts`, not `.ts`.** Vite 8 warns about ESM syntax in a
  `.ts` config loaded as CommonJS (`test-vitest-config-ts-warning.txt`). The `.mts` name loads it
  as ESM with no warning (`test.txt`), and the generated tsconfig already includes `**/*.mts`.
- **`include: ["src/**/*.test.ts"]`.** Vitest's default pattern would also collect
  `e2e/smoke.spec.ts` and fail on it.
- **`environment: "node"`.** No jsdom and no testing library in this run. Both arrive with the
  first component run, by ADR, because they are new dependencies.
- **Tests sit beside their module as `*.test.ts`, and import it by relative path.** Vitest does
  not read the tsconfig `@/*` alias, and this ADR adds no alias config.
- **One real unit test:** the environment reader in decision 8, `src/lib/supabase/env.test.ts`.

### Playwright

**The matrix, the output paths and the split between suite and MCP are not decided here.** The
source is `actio-test-protocol`, section "Automation with Playwright", written by
`2026-09-27-qa-playwright`. That section was not on disk when this stage started. It landed
during the stage, and it changed again after the first handoff of this ADR (skill file time
20:02:26Z, handoff 20:01:57Z). This decision conforms to the section as it stands at the resumed
pass of this stage, and cites it rather than restating it. The division of work is the
doctrine's: the suite is the only Playwright instrument that produces gate evidence, and it is
the only one frontend-engineer holds, because only qc-engineer and qc-lead carry the Playwright
MCP. What the doctrine leaves to ADR-0002, this decision records:

- **The suite's home.** The doctrine's paragraph "Where the suite lives" names three things
  "by convention, until ADR-0002 records it". This ADR records them: the config is
  `web/playwright.config.ts`, the specs are `web/e2e/*.spec.ts`, the `e2e` script is
  `playwright test`, and the version is `@playwright/test` 1.63.0 (decision 1).
- **The browser.** Playwright's Chromium at that pinned version, installed once per machine with
  `npx playwright install chromium`, run from the repository root. npm hoists `@playwright/test`
  to the root `node_modules`, so `npx` runs the pinned 1.63.0 rather than fetching another. The
  install step prints the version first so the evidence shows which one ran
  (`brief-dry-run/resumed/playwright-install.txt`).
- **The Chromium Android descriptor for phone widths.** The doctrine asks for "a Chromium
  Android descriptor", without naming one. Use `devices["Moto G4"]`, the low-cost Android
  profile in Playwright's registry: `isMobile` and `hasTouch` true, `defaultBrowserType`
  `chromium`. CLAUDE.md's target device is a low-cost Android handset.
- **How the app sets its theme.** In this run it sets none, so the project's `colorScheme` is
  the whole theme mechanism and no fixture is written. The run that gives the app a theme records
  its mechanism in its own ADR, and the doctrine's fixture follows that ADR. This one cannot
  record a mechanism that does not exist yet, and it is immutable once handed off.
- **frontend-engineer's evidence folder.** The doctrine writes `evidence/<agent>/e2e/<pass>/`,
  and `frontend-engineer.md` names that agent's folder `evidence/frontend/`. This run uses
  `evidence/frontend/e2e/<pass>/`, so every frontend file sits in one folder.

`web/playwright.config.ts`:

| Setting | Value | Why |
|---|---|---|
| `testDir` | `./e2e` | The doctrine's spec directory |
| `reporter` | `[["list"]]` | This is the default for a plain `npm run e2e`. When a test fails, the HTML reporter serves its report and waits, which never returns in a non-interactive shell. The doctrine's gate command overrides the reporters on its command line, with `PLAYWRIGHT_HTML_OPEN=never` |
| `forbidOnly`, `retries` | `true`, `0` | A stray `.only` fails the run, and a failure is never retried into a pass |
| `use.baseURL` | `http://localhost:3000` | Next's default port |
| `use.trace` | `"retain-on-failure"` | This is the default for a plain run, and traces go to `web/test-results/`, which the root ignores. The doctrine's gate command sets `--trace=on` |
| `webServer.command` | `npm run build && npm run start` | The production server, and it works from a fresh clone. `&&` runs under cmd.exe |
| `webServer.url` | the `baseURL` | |
| `webServer.reuseExistingServer` | `false` | If something already holds port 3000, the run fails loudly rather than testing some other server |
| `webServer.timeout` | `300_000` | The build runs inside it, and commands here are slow |
| `projects` | The doctrine's 20: widths, themes and locales, generated from three lists and named `<width>-<theme>-<locale>` | The widths are 320, 360, 768, 1024 and 1440 (CLAUDE.md hard rule 9), the themes `light` and `dark`, and the locales `en` and `ar`. The phone widths, 320 and 360, spread `devices["Moto G4"]`. The rest spread `devices["Desktop Chrome"]`. Each overrides the width only, and takes its height from the descriptor. Each sets `colorScheme` to its theme and `locale` to its locale |

The doctrine's `layout-<case>` projects are not configured in this run. The doctrine leaves
their widths to the test plan, and a scaffold has no layout to test.

### The one smoke, `web/e2e/smoke.spec.ts`

It tests no surface. It proves that the production server boots and serves the root at every
width.

**Which projects it runs in.** The doctrine says every spec runs in every project "unless its
title says why it does not". This one runs in the five `<width>-light-en` projects only. It is
skipped in the other 15 by a file-level `test.skip` whose reason cites this decision. The title
says why: the app has no theme and no direction yet. In a `dark` or `ar` project it would pass
while exercising nothing, because the page sets no theme and no direction for the project to
change. A check that cannot reach what it names reads as proof. The skips are
visible in the results, as `skipped: 15`.

**What it asserts, in this order:**

1. `GET /` answers 200.
2. `window.innerWidth` equals the project's width, as the doctrine asks of every spec.
3. `<html>` carries no `dir` attribute. This is the doctrine's `dir` assertion, set to what the
   scaffold renders. It fails the day anything sets `dir`, so the locale routing run cannot land
   without replacing it: that run asserts `dir` as `ltr` for `en` and `rtl` for `ar`, and removes
   the skip for the `ar` projects.
4. The computed `direction` of `<body>` is `ltr`, the doctrine's second direction assertion.
5. The rendered text of `<body>` is empty.
6. No `http` or `https` request goes to an origin other than the app's own. This holds
   `BRAND.md` §3 (no public font CDN) and boundary B9 at runtime.
7. No page error and no console error.

**Measured:**

- Through the doctrine's gate command, verbatim, with this spec: 20 projects, `expected: 5`,
  `skipped: 15`, `unexpected: 0`, `flaky: 0` (`brief-dry-run/e2e/run-2/run.log`,
  `results.json`). `--trace=on` wrote 20 `trace.zip` files, one per project, including the 15
  skipped ones: the skip condition reads the project's fixtures, so it is decided after the test
  has started and the trace is already recording.
- It fails when `<html>` carries `dir` (`brief-dry-run/resumed/e2e-dir-fires.txt`), and when the
  page renders text (`brief-dry-run/e2e-smoke-fires.txt`, measured on the spec before assertion 3
  was added).
- `brief-dry-run/e2e/run-1/` holds the same command's run on the spec before assertion 3. It is
  kept, not overwritten, as the doctrine asks of a pass directory.
- The first mirror measured an earlier five-project form (`e2e-smoke.txt`,
  `e2e-smoke-fires.txt`), and its smoke results are superseded. The probe of the root document
  and of an unknown route in `e2e-smoke-fires.txt` still stands, because it measures the page, not
  the config.

---

## Decision 8 · The Supabase client contract

### Modules

| Module | Exports | Behaviour |
|---|---|---|
| `web/src/lib/supabase/env.ts` | `SUPABASE_ENV_NAMES`, `readSupabaseEnv(values)`, `supabaseEnv()`, `SupabaseEnvError`, type `SupabaseEnv` | Details below the table |
| `web/src/lib/supabase/browser.ts` | `createBrowserSupabaseClient()` | Calls `supabaseEnv()`, then `createBrowserClient(url, publishableKey)` from `@supabase/ssr` |
| `web/src/lib/supabase/server.ts` | `createServerSupabaseClient()`, async | Calls `supabaseEnv()`, awaits `cookies()` from `next/headers`, then calls `createServerClient(url, publishableKey, { cookies: { getAll, setAll } })`. `setAll` writes through the cookie store inside a `try`. Its `catch` carries a one-line comment: a Server Component cannot write cookies, and the session-refresh proxy does |

**What `env.ts` does:**

- `SUPABASE_ENV_NAMES` holds the two variable names.
- `readSupabaseEnv(values)` is pure. It trims both values, treats empty or blank as absent,
  returns `{ url, publishableKey }`, or throws `SupabaseEnvError`.
- `SupabaseEnvError` carries `code: "supabase_env_missing"` and `missing`, the names of the
  absent variables in the order URL then key. It never carries a value.
- `supabaseEnv()` passes `process.env.NEXT_PUBLIC_SUPABASE_URL` and
  `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, each written out as a static property
  access, to `readSupabaseEnv`.

**Why the access must be static.** Next inlines a `NEXT_PUBLIC_` value into the browser bundle
only when it is written out literally. A computed `process.env[name]` reads `undefined` in the
browser.

### Rules

- **No client and no environment read at module level.** The environment is validated when a
  factory is called, never when a module is imported. So `next build` passes with no
  `.env.local` (`build-env-absent.txt`), and use fails with a message naming the missing
  variables.
- **The browser client takes its values at build time.** Next inlines them into the browser
  bundle, so a change to `.env.local` needs a rebuild, or a `next dev` restart.
- **The variable names.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  as Supabase's own Next.js guide names them.
- **The key.** The key variable holds the project's publishable key from `get_publishable_keys`,
  or the anon key from `get_anon_key` if that is the tool the server exposes. Both are the
  low-privilege client key that RLS and the revokes constrain.
- **`web/.env.example` is the declaration.** It is tracked, and it declares both names with
  empty values. A comment line is allowed. D-06 and D-08 check it against the code.
- **`web/.env.local` is never committed, and never typed by hand.** It is written only from
  MCP output, by the frontend-engineer entry that run.json done_means 10 holds until the MCP
  answers. Nothing in this run reads a key.
- **The secret key never appears under `web/`.** That is the service role key. It is absent
  from code, comments, env names, env files and tests. No variable name under `web/` contains
  `SECRET`, `SERVICE` or `PRIVATE` (hard rule 7, `actio-supabase`, D-07).
- **The server client runs unprivileged.** It uses the same publishable key and the reader's
  session cookie, so it acts as `anon` or `authenticated`, never as anything elevated.
- **The project ref is never written in `web/`.** It arrives only inside the URL in
  `.env.local`, and D-07 fires if it appears.
- **No session-refresh proxy in this run.** Next 16's `proxy.ts` would call the project on every
  request, and it needs an auth flow that does not exist yet. It lands with the first auth run,
  by ADR.
- **No generated database types in this run** (run.json out_of_scope). The clients use the
  library's default generic until `web/src/lib/database.types.ts` is generated through
  `generate_typescript_types` in the first back-end run.
- **`SupabaseEnvError` is not the API error shape.** It is a developer-facing configuration error
  and is never rendered to a reader. The one error shape in `actio-architecture`, which wraps
  PostgREST's errors, lands with the data client in the first run that reads data.

---

## Decision 9 · `.gitignore`

**`web/.gitignore` is deleted, not patched.** The generated file ignores `.env*`, and a nested
ignore file governs its own directory, so `web/.env.example` would be ignored and never
committed. Patching it with `!.env.example` would leave two files governing one env file, which
is that shape. The root `.gitignore` was written for `web/`: its comments name `web/.env.local`
and `web/.next/`. Checked against every path the app writes (`gitignore-check.txt`), it:

- ignores `node_modules/`, `.next/`, `next-env.d.ts`, `*.tsbuildinfo`, `coverage/`,
  `playwright-report/` and `test-results/`;
- ignores `.env` and `.env.*` at any depth, so `web/.env.local` is ignored;
- re-includes `web/.env.example` through `!.env.example`, so D-05 is silent.

**One pattern moves to the root.** Of the generated file's patterns, one applies here and is
missing from the root: `*.pem`. It is added to the root's environment block, so deleting the
nested file loses no protection. Its other patterns serve tools this repository does not use: Yarn
Plug'n'Play, Yarn, the hosting vendor's folder and package-manager debug logs. They are not
carried over. This overrides `frontend-engineer.md` line 36, "add `!.env.example` to
`web/.gitignore`", because there is no `web/.gitignore`.

---

## Decision 10 · Boundaries the scaffold must not cross

Next's server code is a renderer over the reader's own session. It is not a second back end.
Server components, route handlers and server actions never enforce an invariant, never check a
permission of their own and never hold an elevated key. `actio-architecture` calls a second
enforcement point that can disagree with the first a defect, and a Next route that grows a
threshold check would be exactly that.

| # | Boundary | What `web/` does, now and after this run | Foundation for |
|---|---|---|---|
| B1 | Survey ingest to issue store | Never writes response text into an issue. Ingest arrives through a function in a later run | I3 |
| B2 | Issue store to reporting | Computes no aggregate, rate or count from rows. Every figure arrives already computed, with its `_n`, from a security-definer function | I1, I2 |
| B3 | Issue store to protected-case store | Never names the `protected` schema. No client is configured with a schema other than the default | I4 |
| B4 | Free text to any reader | Never selects a raw text column. Free text arrives only reworded, from the read function | I3 |
| B5 | Evidence to issue status | Never writes a status except through the path the transition trigger guards | I5, I6, I7 |
| B6 | Service to service | Next server code carries no business rule and reaches no table past the one path a feature's contract names | all |
| B7 | API to channel egress | Assembles no WhatsApp or SMS body. Messaging lives in Edge Functions | none directly |
| B8 | Identity and permission | The only key under `web/` is the publishable one. Every permission is decided in the database from `auth.uid()`, never from a role name read in the client | I1 to I7 |
| B9 | Trust boundary to third parties | The browser requests nothing off its own origin, and the smoke asserts it. Development-time egress is named below. The Supabase project is the one runtime third party, and it is the back end | all |
| I8 | Deadlines in the site time zone | Renders no date in this run. The date formatter lands with the first surface, and it reads the labelled site time zone field, never the browser's | I8 |

**B9, development-time egress, carrying no employee data:**

- The npm registry, for installs.
- Playwright's browser download host, for chromium.
- Next.js telemetry, which sends anonymous build and usage metadata to the framework vendor, and
  is on by default (`next-telemetry-status.txt`). It is off in this repository, by decision 11.

---

## Decision 11 · Next.js telemetry is off, in the repository

**Decided by Shehab on 2026-09-27**, accepting the recommendation to turn it off. What is left to
this ADR is the mechanism. It has to be committed and reproducible, so that it holds on every
clone and every machine, not only on the one where somebody ran a command.

Next reads one switch, the `NEXT_TELEMETRY_DISABLED` environment variable, at the moment each
of its processes constructs its telemetry. The only other switch is a preference stored per
user, outside the repository.

| Option | Consequence |
|---|---|
| `npx next telemetry disable` on this machine | Rejected. It is a per-user preference outside the repository. Every other clone, and any future CI machine, would still report |
| `NEXT_TELEMETRY_DISABLED=1` in a committed `web/.env` | Rejected. It needs a negation in the root `.gitignore` for the one file every other rule treats as never committed, and D-05 fires on it. It would also leave a tracked file that Next loads into the server environment, which is where the next secret gets typed |
| A `NAME=value` prefix on the npm scripts | Rejected. It is POSIX syntax, and npm runs scripts under cmd.exe here. D-10 fires on it. A cross-platform setter would be a new dependency |
| A launcher script that sets the variable and then runs the Next CLI | Rejected. Every Next script would change from the commands decision 6 and `frontend-engineer.md` name, and a new file under `web/` would do the work of one line |
| **One statement at the top of `web/next.config.ts`: `process.env.NEXT_TELEMETRY_DISABLED = "1";`** | **Chosen.** Committed, in a file that already exists, with no dependency and no new file. It sets `process.env`, not the config's `env` key: that key inlines values into the browser bundle and never reaches Next's own processes |

**Why one line in the config reaches every Next process.** Each process that can send telemetry
loads `next.config.ts` before it constructs its telemetry, and the Next 16.3.6 source is written
that way on purpose ("read in the constructor so that .env can be loaded before reading"):

| Process | Order in the 16.3.6 source | Measured |
|---|---|---|
| `next build` | `dist/build/index.js` loads the config, then constructs its telemetry | 7 requests to the telemetry endpoint without the line, 0 with it |
| `next start` | `dist/server/lib/router-server.js` loads the config, then constructs its telemetry | 0 with the line, across the e2e run-2 web server's build and start |
| `next dev`, the server | `dist/server/dev/next-dev-server.js` runs after the config is loaded | Read, not measured separately |
| `next dev`, the CLI parent | Never loads the config. It sends its one event, session stopped, through a detached flush process, `dist/telemetry/detached-flush.js`, which loads the config before it constructs its telemetry | 1 request without the line, 0 with it, on a synthetic session-stopped event |

The measurements are in `brief-dry-run/resumed/telemetry-network-probe.txt`. A preloaded probe
recorded every request to the telemetry endpoint and answered it locally, and a dead proxy was set
as well, so nothing left the machine in either case. The state check that frontend-engineer runs
uses Next's own config loader and telemetry class. It reads `enabled` before the config is loaded
and `disabled` after (`brief-dry-run/resumed/telemetry.txt`), and it reads `enabled` after the
load when the line is removed (`telemetry-fires.txt`).

**What the line does not change.** The per-user preference. `npx next telemetry status` reads
only that preference, and never loads the project's config, so on this machine it still prints
`Enabled`. That is not a failure of the opt-out. The proof is the state check in brief step 25.

---

## One source per concept

The regression brief lists six concepts that could be defined twice in this run. Each has one
source.

| Concept | The source | Everything else |
|---|---|---|
| The version pins | Decision 1's table, for this run. After release, the manifests and the root lockfile (decision 2) | `web/package.json` must equal the table. brief-frontend points at the table and does not copy it. `frontend-engineer.md` line 36's `@latest` is overridden in words |
| The ADR's home | `docs/architecture/adr/`, as `actio-architecture` states | run.json amendment 1 points here. No copy sits in the run directory |
| The env file ignore rule | The root `.gitignore` | `web/.gitignore` does not exist (decision 9) |
| The env variable names | `web/.env.example`, the declaration | This ADR records the choice. `env.ts` must read each name as a literal (decision 8), and D-08 checks that the code reads only declared names |
| The script names | `CLAUDE.md` Toolchain and `actio-architecture` Repository layout, which agree. The command lines live only in `web/package.json` | No root proxy scripts (decision 6). No `web/README.md` |
| The agent-instructions file | The root `CLAUDE.md` | `--no-agents-md` and `agentRules: false` keep `web/` free of a second one. D-16 checks it |
| The Playwright matrix and its output paths, a seventh concept this ADR adds to the six | `actio-test-protocol`, "Automation with Playwright" | Decision 7 cites it and records only what the doctrine leaves to ADR-0002. `web/playwright.config.ts` generates the matrix from three lists and does not type it out |
| The telemetry opt-out, an eighth concept this ADR adds | The one statement in `web/next.config.ts` (decision 11) | No per-user `next telemetry disable`, no `.env` file and no script prefix carries a second copy |

---

## Consequences

**Good.**

- One compiler and one linter, and every declared peer range is satisfied. Nothing is forced.
- The scaffold builds, lints, typechecks, tests and boots in the mirror with no `.env.local`.
  The commands frontend-engineer runs are the ones that already ran here.
- `web/` holds no demo artefact, stylesheet, font, icon, agent file or product string to strip.
  Almost everything is prevented at creation rather than removed afterwards.
- A fresh clone typechecks before any build.
- The smoke holds the no-CDN rule at runtime, not only by grep.
- The Playwright config carries the testing doctrine's full matrix from the first commit, so the
  first surface run adds specs, not projects.
- The data client has exactly one door: three modules, one key, one place that reads the
  environment.
- Next.js telemetry is off on every clone, from one committed line, with a check that fails if
  the line is removed.

**Bad, and who pays.**

- TypeScript and ESLint are each one major behind the latest, and Shehab asked for the latest.
  He accepted the pins on 2026-09-27. The move waits on typescript-eslint and on three ESLint
  plugins.
- The telemetry line is a side effect in a config file, which a later reader could take for dead
  code and delete. Its comment cites decision 11, and brief step 25's check reads `enabled` if it
  goes. It also relies on Next loading the config before it constructs its telemetry, which a
  later Next release could change.
- ESLint 9.39.5 is deprecated on the registry. security-analyst decides whether to accept it for
  development use.
- Without Tailwind, the tokens run wires the styling layer itself, including its PostCSS
  configuration.
- The framework's English not-found and error pages stay until the first surface run.
- A browser-bundle environment change needs a rebuild.
- bug-historian's D-12 prints 107 lines on the healthy tree in the mirror, where `npm ls` exits 0
  (`npm-ls-healthy.txt`). Of those, 105 are `UNMET OPTIONAL DEPENDENCY` lines for other platforms'
  binaries. The other 2 are `extraneous` lines for sharp's wasm32 fallback and its runtime. The
  check needs rescoping, and brief-frontend tells frontend-engineer what healthy looks like until
  it is.

**Binding on later runs.**

- **Before any deploy.** No hosting target is deployed until a surface run has done four things,
  in English and Arabic: replaced Next's default not-found, error and global-error pages; set
  `lang` and `dir` on `<html>` from the locale; set the document title from the string catalogue;
  and chosen the app icon from `logo/app-icon/`.
- **The tokens run** decides the styling layer and pins its version. If it gives the app a theme,
  its ADR records how the theme is set, and the smoke stops skipping the `dark` projects.
- **The locale routing run** replaces the smoke's `dir` assertion with the per-locale value and
  stops skipping the `ar` projects (decision 7).
- **The first surface run's ADR** sets the client performance budget against the baseline
  frontend-engineer measures in this run.
- **The first auth run** adds the session-refresh proxy.

**Migration.**

- `web/` is new, and there is no migration.
- The root `package.json` changes one pin, to the version already resolved.
- The root `.gitignore` gains `*.pem`.
- The root `package-lock.json` gains the `web` workspace.

---

## What would make us revisit

- `npm view typescript-eslint@latest peerDependencies.typescript` admits a 7.x release, and
  eslint-config-next's range admits that typescript-eslint. Then move to TypeScript 7, by a new ADR.
- The latest releases of eslint-plugin-react, eslint-plugin-import and eslint-plugin-jsx-a11y all
  declare ESLint 10, or eslint-config-next stops depending on them. Then move to ESLint 10.
- A high or critical advisory lands against eslint 9.39.5 or anything in its tree.
- Next.js removes `experimental.useTypeScriptCli`, or changes its default.
- The tokens run chooses the styling layer.
- The automation doctrine in `actio-test-protocol` changes its matrix or its output paths.
  Decision 7 then follows it, because the doctrine is the source for both.
- A hosting target is chosen. The deploy constraint under Consequences then applies.
- D-16 fires after a `next dev`, which would mean `agentRules: false` did not hold.
- After any Next.js upgrade, brief step 25's telemetry check reads `enabled` after the config is
  loaded, or Next adds a config key for telemetry. Then decision 11 is re-decided, by a new ADR.

---

## Deferred, named rather than dropped

| Item | Where it lands | What it carries |
|---|---|---|
| Locale routing and direction | Its own ADR, with ux-designer and ux-writer | Candidate approach: a root `src/app/[lang]/` segment read through Next 16.3's root params (`next/root-params`), setting `lang` and `dir` on `<html>` for `en`, `ar`, `id` and `tl`. Not built here. It replaces the smoke's `dir` assertion (decision 7) |
| Tokens and the styling layer | The tokens run, `BRAND.md` §9 step 1 | Decision 4 |
| Fonts | The fonts run, `BRAND.md` §3 | Self-hosted WOFF2, subset as §3 states |
| The not-found, error and global-error surfaces, the document title and the app icon | The first surface run | The deploy constraint above |
| The session-refresh proxy and the auth flow | The first auth run | Decision 8 |
| `web/src/lib/database.types.ts` | The first back-end run | run.json out_of_scope |
| The data client that wraps PostgREST errors into the one error shape | The first run that reads data | `actio-architecture`, API contract conventions |
| The client performance budget | The first surface run's ADR | The baseline is measured in this run |
| `docs/architecture/architecture.md`, `invariants.md` and `glossary.md` | The next run that may commit under `docs/architecture/` | This run may add one file there (run.json amendment 1) |
