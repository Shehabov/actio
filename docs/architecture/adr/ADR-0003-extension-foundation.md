# ADR-0003 · The extension/ foundation: an empty Manifest V3 Chrome extension beside web/

- **Status.** Accepted
- **Date.** 2026-09-28
- **Run.** 2026-09-27-dev-setup, amendment 2
- **Invariants touched.** None is enforced here, and none may be. Decision 8 names the
  boundaries the extension must not cross, now and when it first reads data.
- **Follows.** ADR-0002, the web/ foundation. Every pin, the pinning policy, the one root
  lockfile, the one compiler, the lint stack and the Playwright doctrine come from ADR-0002, and
  this ADR changes none of them.
- **Supersedes.** none
- **Superseded by.** none
- **Product Lead decisions.** One, taken before this ADR: Shehab added the toolchain for a
  Chrome extension to this run on 2026-09-27 (run ledger, 19:13:38Z). What the extension does
  for users, and which roles it serves, is still his decision and is not taken here.

---

## Context

Shehab asked for the packages to build a Chrome extension for the product. `extension/` does
not exist. The run builds an empty extension that Chrome can load, with no surface a reader can
see beyond its name (run.json done_means 8 and 9).

The constraints, all measured rather than recalled:

- **Who the extension can serve.** Chrome on Android does not run extensions, and the frontline
  reader is on an Android handset (`CLAUDE.md`, target device). An extension can serve only the
  desktop roles: team lead, operations and site director.
- **ADR-0002 is accepted and immutable.** Its pins are React 19.3.0, TypeScript 6.0.3, ESLint
  9.39.5, Vitest 5.0.2, @playwright/test 1.63.0 and @types/node 24.19.0. Its decisions are one
  root `package-lock.json`, exact pins, no `overrides`, no forced install and no root proxy
  scripts. The extension joins that tree. It does not fork it.
- **The browser.** Chrome 137 and later ignore `--load-extension` in branded builds. On this
  machine, branded Chrome 153 loads nothing through the switch. Playwright's own chromium does
  (decision 4).
- **The machine.** npm runs scripts under cmd.exe. The Bash tool has no working heredoc and
  collapses doubled backslashes (regression brief, facts 2 and 4).
- **Shared files.** `CLAUDE.md`, `README.md`, `docs/TEAM.md`, the root `.gitignore` and
  `.claude/**` carry another run's uncommitted edits (ledger, 00:08:27Z). This ADR needs no
  change to `.gitignore`, because it already ignores `dist/`, `test-results/` and
  `playwright-report/` at any depth. The enumeration edits of decision 7 are proposed as a
  patch, not applied.

The measurements are under `.actio/runs/2026-09-27-dev-setup/evidence/tech-architect/extension/`,
written `EV/` below. Each file opens with a line saying where it ran. `candidates/` and
`loader/loader-probe-*` come from the previous stage 2 attempt, which the usage limit cut off
before it wrote to the run directory. Every other file comes from this pass, in the scratch
mirror `s2`. That mirror holds the root `package.json` and lockfile as brief-frontend leaves
them, with `web/` installed, and `extension/` added from the files brief-extension specifies.

---

## Decision 1 · Framework: plain Vite, with the React plugin

### Options, measured

Each candidate was installed into one root lockfile beside `web/`, then compared with the
web-only tree (`EV/candidates/*-tree.txt`, `EV/s2/tree.txt`). The registry facts are in
`EV/registry-facts.txt`, read again at 2026-09-28T04:31:25Z. Nothing had moved since the
previous attempt's read at 2026-09-27T23:42:49Z.

| | wxt 0.21.4 with @wxt-dev/module-react 1.2.2 | @crxjs/vite-plugin 3.0.0 with vite 8.3.1 and @vitejs/plugin-react 6.1.1 | plasmo 0.90.5 | **Plain Vite 8.3.1 with @vitejs/plugin-react 6.1.1** |
|---|---|---|---|---|
| Packages added to web/'s tree | 96 | 28 | 538 | **5** |
| TypeScript copies in the tree | 1, 6.0.3 | 1, 6.0.3 | 3: 5.2.2, 5.8.2 and 6.0.3 | **1, 6.0.3** |
| Bundlers in the tree | Vite 8.3.1 | Vite 8.3.1, plus rollup 2.80.0 pinned exactly | Parcel 2.9.3, a second esbuild (0.18.20), and Vite for Vitest | **Vite 8.3.1, the one Vitest already needs** |
| `npm install` audit | 0 vulnerabilities | 0 | 73: 69 high, 4 moderate | **0** |
| Latest release; stable releases in the last 12 months | 2026-08-11; 21 | 2026-09-24, four days before this ADR; 9 | 2025-05-17; 0 | **Vite 2026-09-24, 53; the plugin 2026-08-28, 14** |
| Manifest V3 | First-class. It generates the manifest from config and entry-point files | First-class. It reads a manifest file and rewrites its paths | Supported | **No support needed. The manifest is a static file, copied into the build unchanged** |
| Typecheck on a fresh clone | Fails until `wxt prepare` generates `.wxt/`, so the script becomes `wxt prepare && tsc --noEmit` (`EV/candidates/wxt-typecheck.txt`) | `tsc --noEmit` | Not measured | **`tsc --noEmit`** |
| Network at build | None (`EV/candidates/wxt-net-probe.log`) | Not measured | Not measured | **None (`EV/telemetry/net-probe-extension.log`)** |

**Rejected: plasmo.** No release in 16 months. It pins TypeScript 5.8.2 as a direct dependency,
which brings two more compilers into the tree. ADR-0002 exists to keep one compiler. It also
installs 69 high advisories, and done_means 11 requires none.

**Rejected: CRXJS.** A Vite plugin, which fits. But it pins rollup 2.80.0 and rxjs 7.5.7
exactly, so the tree gains a second bundler, three majors behind the one Vite 8 uses. Its 3.0.0
release is four days old. The dependency count is not what rejects it. A second bundler in the
tree is the kind of hidden second tool that ADR-0002 refused for the compiler.

**Rejected, and the named alternative: WXT.** It is the best-maintained framework here, and the
most capable: dev reload, content-script builds, and manifest generation for several browsers.
The costs, measured:

- It is pre-1.0, with 21 releases in a year. Under ADR-0002 decision 2, every 0.x minor is a
  breaking change and so an ADR.
- A fresh clone cannot typecheck without a code-generation step.
- The shipped manifest is generated, so it is not a file a reviewer reads.
- It brings 96 packages. They include a store-publishing tool (`publish-browser-extension`), a
  template downloader (`giget`) and a package-manager runner (`nypm`). None is needed to build
  an empty extension, and each is a tool that can reach the network or a store.

It becomes the right choice when a content script is needed ("What would make us revisit").

**Chosen: plain Vite.**

- Vite is already in the tree at 8.3.1, as Vitest's required peer (ADR-0002 decision 1). The
  extension adds `@vitejs/plugin-react` and `@types/chrome`, and `@types/chrome` brings 3 type
  packages of its own. That is 5 packages (`EV/s2/tree.txt`). Each one was checked against the
  registry, as `actio-security` E1 asks. All five were first published between 2016 and 2021,
  from the Vite and DefinitelyTyped repositories, and each has more than 4 million downloads a
  week (`EV/e1-new-packages.txt`).
- The manifest is `extension/public/manifest.json`. Vite copies `public/` into `dist/` unchanged,
  so the file a reviewer reads is byte for byte the file Chrome parses
  (`EV/s2/build.txt`, and the `cmp` in brief-extension step 8).
- One compiler, one bundler, one React.

### The pin table

This table is the source for the extension's pins. `extension/package.json` must equal it, entry
for entry, with nothing added and nothing missing. The first column matches the manifest section,
so brief-extension step 6 can diff the two. "Latest" is the registry `latest` tag, read at
2026-09-28T04:49:09Z (`EV/registry-latest.txt`).

| Manifest and section | Package | Pin | Registry latest | Is the pin the latest? |
|---|---|---|---|---|
| extension dependencies | react | 19.3.0 | 19.3.0 | yes, and equal to ADR-0002 |
| extension dependencies | react-dom | 19.3.0 | 19.3.0 | yes, and equal to ADR-0002 |
| extension devDependencies | @eslint/js | 9.39.5 | 10.0.1 | no: equal to the ESLint pin in ADR-0002, whose reason holds |
| extension devDependencies | @playwright/test | 1.63.0 | 1.63.0 | yes, and equal to ADR-0002 |
| extension devDependencies | @types/chrome | 0.3.0 | 0.3.0 | yes. New to the tree |
| extension devDependencies | @types/node | 24.19.0 | 26.6.3 | no: ADR-0002's pin, typing Node 24, the lowest runtime the root admits |
| extension devDependencies | @types/react | 19.3.0 | 19.3.0 | yes, and equal to ADR-0002 |
| extension devDependencies | @types/react-dom | 19.3.0 | 19.3.0 | yes, and equal to ADR-0002 |
| extension devDependencies | @vitejs/plugin-react | 6.1.1 | 6.1.1 | yes. New to the tree |
| extension devDependencies | eslint | 9.39.5 | 10.11.0 | no: ADR-0002's pin, the latest the lint plugins accept |
| extension devDependencies | eslint-plugin-react-hooks | 7.1.1 | 7.1.1 | yes, and already in the tree through eslint-config-next |
| extension devDependencies | typescript | 6.0.3 | 7.0.2 | no: ADR-0002's pin, the latest the whole stack declares |
| extension devDependencies | typescript-eslint | 8.70.1 | 8.70.1 | yes, and already in the tree through eslint-config-next |
| extension devDependencies | vite | 8.3.1 | 8.3.1 | yes, and already in the tree as Vitest's peer |
| extension devDependencies | vitest | 5.0.2 | 5.0.2 | yes, and equal to ADR-0002 |

The table has 15 entries: 2 dependencies and 13 devDependencies. Brief-extension step 6 prints
the number it compared.

**Said plainly.** Eleven of the 15 pins are the latest. The four that are not are
`typescript`, `eslint`, `@types/node` and `@eslint/js`. Each equals ADR-0002's pin for the same
package, or, for `@eslint/js`, the pin of the ESLint it belongs to. Shehab accepted those on
2026-09-27. Every entry but `@types/chrome` and `@vitejs/plugin-react` resolves to a copy the
tree already holds for `web/`, so npm installs it once and hoists it (`EV/s2/tree.txt`: one
version each of typescript, vite, react, eslint, vitest and @playwright/test).

**Why each package is a direct dependency.** A workspace imports only what it declares. Several
of these would resolve through `web/`'s tree, but relying on that would be a phantom dependency.
`react` and `react-dom` are the done_means' React. No file imports them in this run, because
every React component in an extension is a page, and pages are surfaces (decision 3).

---

## Decision 2 · The workspace

- **`extension/` is the second npm workspace.** The root `package.json` changes in one place:
  `"workspaces": ["web", "extension"]`. It gains no dependency and no script, so brief-frontend
  step 20 still compares 14 entries.
- **One lockfile.** The root `package-lock.json` gains the `extension` entry. `npm install` runs
  at the root and nowhere else. Measured: after `web/`, the install adds 6 packages, the
  workspace link and the 5 above, and reports 0 vulnerabilities (`EV/s2/install.txt`).
- **The pinning policy is ADR-0002 decision 2's, unchanged.** Exact pins, no `overrides`, no
  `.npmrc` relaxation and no forced install.
- **One version.** `extension/package.json` carries no `version`. The extension's version is
  the manifest's `version`, the one Chrome reads. A second copy in the npm manifest would drift
  from it. npm accepts a private workspace with no version: `npm ls` exits 0 and prints
  `extension@` (`EV/s2/npm-ls-extension.txt`).
- **No `type` key.** The Vite and Vitest configs are named `.mts`, for ADR-0002 decision 7's
  reason. Playwright's config and specs load as CommonJS, as `web/`'s do.

### Scripts

The names are ADR-0002 decision 6's, where they apply. This ADR adds no name.

| Script | Command | Note |
|---|---|---|
| `build` | `vite build` | Writes `extension/dist/`, the unpacked build Chrome loads |
| `lint` | `eslint` | ESLint 9 flat config, `extension/eslint.config.mjs` |
| `typecheck` | `tsc --noEmit` | Works on a fresh clone. No code generation first |
| `test` | `vitest run` | `run`, never watch mode |
| `e2e` | `playwright test` | Builds first, in Playwright's global setup (decision 4) |

- **Not carried over: `dev` and `start`.** In `web/` they run Next's servers, and the extension
  has no server. A watch build never exits, so an agent that ran it would hang. The first surface run adds a dev loop if it needs one, by ADR.
- **Where each command runs.** Inside `extension/` with `npm run <name>`, or from the root with
  `npm run <name> --workspace extension`. There are no root proxy scripts (ADR-0002 decision 6).
- **cmd.exe.** None of the five commands uses a construct cmd.exe cannot run (D-10's rule).

### The configs: separate files, one set of tools

| Config | Shared with web/ or separate | Why |
|---|---|---|
| TypeScript | Separate: `extension/tsconfig.json` | `web/tsconfig.json` is Next's, with its plugin, `jsx: preserve` and the `@/*` alias. ADR-0002 decision 5 keeps it as generated, plus one edit. A shared base would reopen an accepted decision, so the extension has its own config for its own targets: a service worker, the `chrome` types and Node for the test files |
| ESLint | Separate: `extension/eslint.config.mjs` | `web/eslint.config.mjs` is eslint-config-next, whose rules are about Next. The extension uses `@eslint/js` recommended, typescript-eslint recommended and React hooks recommended. The hooks rules are scoped to `src/`, because Playwright's fixture callback is named `use`, and the hooks rule fired on it (measured, then fixed: `EV/s2/lint.txt`) |
| The tools themselves | Shared | One TypeScript 6.0.3, one ESLint 9.39.5 and one typescript-eslint 8.70.1, hoisted once. **The repository keeps one compiler** |

---

## Decision 3 · The manifest, and the entry points

`extension/public/manifest.json`, copied into `dist/manifest.json` unchanged:

```json
{
  "manifest_version": 3,
  "name": "Lumofy Actio",
  "version": "0.1.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_security_policy": {
    "extension_pages": "default-src 'none'; script-src 'self'; object-src 'none'"
  }
}
```

| Key | Value | Why |
|---|---|---|
| `manifest_version` | 3 | Manifest V3 |
| `name` | `Lumofy Actio` | The primary lockup, `BRAND.md` §0. The name appears in the extensions page and the store, which is a commercial context, and §0 never presents Actio alone there. It is the only string, and it is the brand's name, not copy. No description string: copy belongs to ux-writer |
| `version` | `0.1.0` | Chrome requires it. It is the extension's one version (decision 2) |
| `background` | One module service worker, `background.js` | The one entry point. It has no surface and does nothing |
| `content_security_policy.extension_pages` | `default-src 'none'; script-src 'self'; object-src 'none'` | Least privilege. Script only from the extension's own files, no remote code, no plugin objects, and every other fetch refused, including network requests. Measured: the worker's request to a local server is refused, and with the policy removed the same request arrives (`EV/s2/csp-egress.txt`) |

**Nothing else.** The manifest has none of these keys: `permissions`, `host_permissions`,
`optional_permissions`, `optional_host_permissions`, `content_scripts`, `action`,
`side_panel`, `options_page`, `options_ui`, `devtools_page`, `chrome_url_overrides`,
`web_accessible_resources`, `externally_connectable`, `icons`, `description`, `default_locale`,
`key`, `update_url` and `oauth2`. The unit test and the smoke both fail on any key outside the
five (decision 4).

**Permissions: none, and no host permission.** The empty extension calls no API that needs one.
The smoke reads what Chrome granted, `chrome.permissions.getAll()`, and expects
`{ permissions: [], origins: [] }`.

**No remote code.** Manifest V3 forbids remotely hosted code, and the policy allows script only
from `'self'`. Vite bundles every import at build time. There is no `eval`, no `new Function`
and no `import()` of a URL.

**The entry points.** One, `src/background.ts`, built to `dist/background.js`.

- **What it contains.** One comment citing this decision, and `export {};`. It registers no
  listener.
- **Why a worker at all.** It is the smallest entry point Manifest V3 has, and no reader can
  see it. It gives the smoke a context inside the extension to read the parsed manifest and the
  granted permissions from. An extension with no entry point loads too, but nothing could then
  observe it except the browser's own settings page.
- **No page.** No popup, side panel, options page or new-tab page. Each would be a surface, and
  surfaces go through the design track.

**No icon.** `BRAND.md` §4: the mark is never redrawn, and the approved files live in `logo/`.
Chrome's default icon stands until a surface run copies a file from `logo/app-icon/` or
`logo/png/`.

**The name is English only, for now.** `BRAND.md` §7.1 carries the Arabic parent lockup, and
hard rule 10 asks for both languages. Chrome localises a manifest name through `_locales` and a
`__MSG_` key, and that is a string catalogue, which is ux-writer's. This follows ADR-0002
decision 5, which keeps the framework's English defaults while nothing is deployed. The
extension is never distributed beyond an unpacked load on a developer's machine until the
condition under "Binding on later runs" is met.

---

## Decision 4 · Testing

### Vitest

- `extension/vitest.config.mts`: `include: ["src/**/*.test.ts"]` and `environment: "node"`, as
  ADR-0002 decision 7 sets them for `web/`.
- **One real unit test**, `src/manifest.test.ts`. It imports `public/manifest.json` and asserts
  five things:
  1. The key set is exactly the five in decision 3.
  2. `manifest_version` is 3.
  3. The name is the §0 lockup.
  4. The background is the one module worker.
  5. The policy is exact.
- **It fires.** Declaring a permission, declaring a host permission and removing the policy
  each fail it (`EV/s2/fires.txt`).

### Playwright: one suite in extension/, one project

- **The suite's home.** `extension/playwright.config.ts`, with specs in `extension/e2e/*.spec.ts`
  and the version from decision 1, equal to `web/`'s. The gate command is the doctrine's, run
  from `extension/` instead of `web/` (brief-extension step 12).
- **One project, `chromium-extension`, not the doctrine's 20.** `actio-test-protocol` generates
  a width, theme and locale matrix for `web/`, where every spec lays out a page. This extension
  has no page. A width, a theme or a direction has nothing to change, and a spec that passes in
  20 projects while exercising nothing in 19 reads as proof. The spec title
  says why, as the doctrine asks. The first surface run decides which projects its pages need.
  `enumeration-patch.md` proposes the doctrine sentence that records this, because
  `.claude/skills/` is a shared file.
- **Global setup builds first.** `e2e/global-setup.ts` calls Vite's `build()` on the
  extension's own config. Every run loads a build made from the source it tests, never a stale
  `dist/`. Measured: Playwright's loader imports Vite 8 here (`EV/s2/e2e/run-1/run.log`).
- **The fixtures.** `e2e/fixtures.ts` launches a persistent context with `channel: "chromium"`
  and `headless: true`, and the arguments `--disable-extensions-except=<dist>` and
  `--load-extension=<dist>`. It then waits for the extension's service worker.

### Which browser honours `--load-extension`

| Browser on this machine | Launched as | Loads the unpacked build? | Evidence |
|---|---|---|---|
| Google Chrome 153, branded | `channel: "chrome"`, headed, headless, and headed with `--disable-features=DisableLoadExtensionCommandLineSwitch` | No, in all three | `EV/loader/loader-probe-default-path.txt` |
| Playwright's headless shell, 153.0.8010.12 | The default for `headless: true` with no channel | No. The shell cannot run extensions | the same file |
| **Playwright's chromium: Chrome for Testing 153.0.8010.12, Playwright build v1243** | **`channel: "chromium"`**, headless and headed | **Yes** | `EV/loader/loader-probe-copy.txt`, `EV/s2/e2e/run-1/` |

**Decided: Playwright's chromium, through `channel: "chromium"`.** It is the build that
`npx playwright install chromium` puts on the machine for @playwright/test 1.63.0, and
brief-frontend step 21 runs that command. It is one browser cache for both suites, and nothing
new to install.

### The smoke, `e2e/smoke.spec.ts`

One test, asserting in this order:

1. The service worker's URL is `chrome-extension://<32 letters a to p>/background.js`.
2. The manifest as Chrome parsed it, read in the worker with `chrome.runtime.getManifest()`,
   has exactly the five keys of decision 3, `manifest_version` 3, and the §0 name.
3. `chrome.permissions.getAll()` is `{ permissions: [], origins: [] }`.
4. The context has no page but the initial `about:blank`.
5. A request from the worker to a local counting server is refused, and the server receives
   none.

**Measured.** The doctrine's gate command gave `expected: 1`, `unexpected: 0` and one
`trace.zip` (`EV/s2/e2e/run-1/`). It fails when a permission is declared, when a host
permission is declared, when the policy is removed and when the worker opens a page. The build,
test, lint and typecheck checks fire on their own defects too, and the healthy tree passes again
after each restore (`EV/s2/fires.txt`). Assertion 5's positive control is `EV/s2/csp-egress.txt`.

### The machine defect, named and not worked around

On this machine, Playwright's chromium does not start from its default path,
`%LOCALAPPDATA%\ms-playwright\chromium-1243\`. The launch fails with `spawn UNKNOWN`. The
Windows Application log records a side-by-side activation failure for that exact path:
"Dependent Assembly 153.0.8010.12 could not be found". Every file in that install hashes the
same as a copy in another directory, and that copy starts and loads the extension. A forced
reinstall to the default path did not clear it (`EV/loader/sxs-diagnosis.txt`,
`EV/loader/playwright-reinstall.txt`). The headless shell `web/` uses starts normally, so
`web/`'s suite is unaffected.

| Option | Consequence |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH=0` set in `extension/playwright.config.ts`, as the previous attempt did | Rejected. It installs a second 433 MB browser (measured with `du`) inside `node_modules`, which the release pre-flight's `npm ci` deletes. It hides a machine repair inside a committed file, and every clone would then carry the workaround |
| `launchOptions.executablePath` pointing at another copy | Rejected. A machine path in a committed file |
| Branded Chrome, or the headless shell | Rejected. Neither loads an unpacked extension (table above) |
| **The config stays machine-neutral. A start probe runs before the smoke, and a failing probe is reported as blocked** | **Chosen.** The repair is to the machine, and it is Shehab's (`decisions_for_shehab` in this stage's handoff). On a machine where the browser starts, the config needs nothing |

### Evidence paths

frontend-engineer writes the suite's output to `evidence/frontend/extension/e2e/<pass>/`, and
every other extension file to `evidence/frontend/extension/`. This keeps ADR-0002 decision 7's
rule that every frontend file sits in one folder, and keeps the extension apart from `web/`'s
`evidence/frontend/e2e/`.

---

## Decision 5 · The future auth path to Supabase: the shape, and nothing built

**Who signs in.** Only the desktop roles. They have real accounts, and `actio-supabase` says
"Managers and operations use normal Supabase Auth with a real account". A respondent never uses
the extension.

**The shape:**

- **The key.** The extension holds the project's publishable key and nothing more, the same
  low-privilege client key as `web/` (ADR-0002 decision 8). It never holds the secret key.
  An extension has no server context, and every file in an installed extension is readable by
  whoever installed it (hard rule 7).
- **The sign-in.** Supabase Auth's PKCE flow, run in a `chrome.identity.launchWebAuthFlow`
  window that redirects to `https://<extension id>.chromiumapp.org/`. supabase-js exchanges the
  code for the user's session.
- **Where the session lives.** In `chrome.storage.session`, through supabase-js's storage
  adapter. It is held in memory and cleared when the browser closes, so a desktop shared across
  a shift keeps nothing on disk.
- **Enforcement.** Every permission is decided in the database from `auth.uid()` (boundary B8),
  exactly as for `web/`. The extension renders the user's own session. It is never a second
  enforcement point.

**What the auth run will add, each by its own ADR:**

1. supabase-js, pinned to ADR-0002's version.
2. The `identity` and `storage` permissions, each justified in writing.
3. A `connect-src` for exactly the project's origin, and nothing wider.
4. A stable extension ID, from a manifest `key` or the store's ID, because the redirect URL
   depends on it.
5. The redirect URL on the project's Auth allow list. That is a dashboard setting, so Shehab
   sets it (`actio-supabase`, "What the swarm does not do").

It still needs no host permission. The Supabase APIs answer cross-origin requests that carry the
key, which is how `web/` calls them.

**Shapes rejected now, so the auth run starts from a narrower set:**

- **Reading `web/`'s session cookie.** It needs the `cookies` permission and a host permission
  for the app's origin, and no hosting target exists yet.
- **Any secret, or a service account, in the extension.** Hard rule 7.
- **A refresh token in `chrome.storage.local`.** It survives a restart on a shared desktop. The
  auth run may revisit this against the cost of signing in each day, in writing.

**Built in this run: nothing.** No Supabase package, no permission, no `connect-src`, no key
and no env file.

---

## Decision 6 · Telemetry: none reports, so nothing is turned off

Shehab's standing decision is that tooling does not report home (ADR-0002 decision 11).

- **Measured.** `vite build`, `vitest run` with its forked worker, `eslint` and `tsc --noEmit`,
  each run under a probe that records and refuses every outbound connection. Together they
  attempted none (`EV/telemetry/net-probe-extension.log`). The same probe records and refuses a
  registry request, so it can see one (`EV/telemetry/net-probe-fires.log`).
- **Playwright** is the same package `web/` uses, and it sends no usage data. Its download host
  is already named in ADR-0002 decision 10 as development-time egress.
- **At run time** the extension sends nothing. Its policy refuses every request (decision 3).
- **So there is no opt-out line to commit.** A setting that turns off something that does not
  exist would read as a mechanism that works.
- **What would change this.** A future dependency that reports usage. That dependency's ADR
  records a committed, reproducible way to turn it off, as ADR-0002 decision 11 did.

For the record, the rejected WXT made no connection during `wxt prepare` or `wxt build`
(`EV/candidates/wxt-net-probe.log`).

---

## Decision 7 · Ownership, and the enumerations that must name extension/

**frontend-engineer builds and owns `extension/`**, as it owns `web/`. It is front-end code, in
React and TypeScript, on the same npm workspace and toolchain. No new role is needed.

Every file that gives `web/` as frontend-engineer's boundary, or enumerates the repository
layout, must also name `extension/` and its owner (done_means 10).

- **The grep and the list.** The files come from a grep, saved with its command and its output
  as `EV/r09-enumeration-grep.txt`.
- **Where the exact edits live.** `.actio/runs/2026-09-27-dev-setup/tech-architect/enumeration-patch.md`
  holds the old and new text for each file, and it is the one source for them. This ADR does
  not copy them.
- **Why the patch is proposed, not applied.** Every one of those files carries another run's
  uncommitted edits (ledger, 00:08:27Z). The patch is applied once they are clean, or its hunks
  are staged alone, as the ledger's rule for shared files says.

---

## Decision 8 · Boundaries the extension must not cross

The extension, like `web/`, renders the reader's own session. It is not a back end, and it
never enforces an invariant, checks a permission of its own or holds an elevated key.

| # | Boundary | What `extension/` does, now and after this run |
|---|---|---|
| B1 | Survey ingest to issue store | Never writes response text anywhere |
| B2 | Issue store to reporting | Computes no aggregate, rate or count. Every figure arrives computed, with its `_n`, from a security-definer function |
| B3 | Issue store to protected-case store | Never names the `protected` schema |
| B4 | Free text to any reader | Never reads a raw text column. Free text arrives only reworded, from the read function |
| B5 | Evidence to issue status | Never writes a status except through the path the transition trigger guards |
| B6 | Service to service | Carries no business rule |
| B7 | API to channel egress | Assembles no WhatsApp or SMS body |
| B8 | Identity and permission | No key of any kind in this run. After decision 5, the publishable key only, and every permission from `auth.uid()` in the database |
| B9 | Trust boundary to third parties | At run time, nothing leaves: the policy refuses every request, and the smoke asserts it. At development time, the npm registry and Playwright's download host, both named in ADR-0002. No telemetry (decision 6) |
| I8 | Deadlines in the site time zone | Renders no date |

---

## Consequences

**Good.**

- The extension adds 5 packages and 0 vulnerabilities. It keeps one compiler, one bundler,
  one React and one lockfile. ADR-0002's pins, and the counts brief-frontend checks, are
  unchanged.
- The manifest a reviewer reads is the manifest Chrome loads.
- Least privilege is checked twice. The unit test reads the file. The smoke reads what Chrome
  granted.
- A fresh clone typechecks, lints, tests and builds with no code-generation step.
- Nothing in the toolchain can publish to a store, fetch a template or report usage.

**Bad, and who pays.**

- There is no dev reload and no content-script build. The first surface run pays for that. It
  adds a Vite HTML input for a page, or re-opens decision 1 for a content script.
- On this machine, the smoke cannot run until Playwright's chromium starts from its default
  path. Shehab pays with a machine repair (the handoff's decision). Until then, done_means 8's
  smoke evidence is held, and every other extension check still runs.
- React is installed and configured, and no file uses it until the first surface run.
  qc-engineer tests the pins and the configuration, not a render.
- The manifest name is English only until the localisation condition below is met.
- `@types/chrome` is 0.x. Its minors can change types, so each bump is reviewed as ADR-0002
  decision 2 says.

**Binding on later runs.**

- **Before the extension is distributed beyond an unpacked load on a developer's machine,** in
  a store or by any other channel, a run with ux-writer must do four things:
  1. Localise the name through `_locales`, in English and Arabic, with `default_locale`, from the
     lockups in `BRAND.md` §0 and §7.1.
  2. Copy the icon from `logo/`, never redrawn (§4).
  3. Have ux-writer write the description.
  4. Have Shehab write the store's privacy disclosures.
- **The first surface run** adds its page as a Vite HTML input. Its ADR decides that page's
  Playwright projects, and it replaces the smoke's "no page" assertion.
- **The first run that needs a content script** re-opens decision 1. WXT is the named
  alternative.
- **The auth run** implements decision 5, with the five additions it names.

**Migration.**

- `extension/` is new.
- The root `package.json` gains `"extension"` in `workspaces`, and the root lockfile gains the
  workspace.
- There is no migration, no change to `.gitignore` and no change to `web/`.

---

## What would make us revisit

- A surface needs a content script, or dev reload is shown to cost more than the framework it
  would need. Then re-open decision 1.
- Chrome for Testing stops honouring `--load-extension`, as branded Chrome did from 137. Then
  re-decide the smoke's loader.
- Vite 9, or `@vitejs/plugin-react` 7. Moving either is a major, so it is a new ADR (ADR-0002
  decision 2).
- A dependency that reports usage enters the extension's tree (decision 6).
- The previous attempt's candidate measurements (`EV/candidates/`) are re-run and disagree with
  the table in decision 1.
- Any trigger in ADR-0002's own list moves a pin this table shares. The two tables then move
  together, by one new ADR.

---

## Deferred, named rather than dropped

| Item | Where it lands | What it carries |
|---|---|---|
| What the extension does, and for which role | Shehab | run.json out_of_scope |
| The first surface: a popup, side panel or options page | Its own run, through the design track | A Vite HTML input, its own Playwright projects, the icon from `logo/` |
| The localised name, the description and the store listing | Before any distribution | Binding on later runs, above |
| Sign-in and data | The auth run | Decision 5 |
| A content script | The run that needs one | Re-opens decision 1 |
| The doctrine sentence for the extension's suite, and the enumerations | `enumeration-patch.md`, applied when the shared files are clean | Decision 7 |
