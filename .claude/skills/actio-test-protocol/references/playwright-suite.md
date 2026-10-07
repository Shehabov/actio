# The Playwright suite: where it lives, the layout projects, the outputs of a pass

Read when: you write or run a suite pass, add a project, or work on the extension suite. The matrix and the gate command are in `SKILL.md`. `<ev>` is your evidence directory: `qc` for qc-engineer, `qc-lead` for qc-lead, `engineering-lead` for engineering-lead.

### Where the suite lives

By convention, until ADR-0002 records it: the config at `web/playwright.config.ts`, the specs
in `web/e2e/*.spec.ts`, run by the `e2e` script (`playwright test`) in `web/package.json`.
`web/` is being created in run `2026-09-27-dev-setup`. Once
`docs/architecture/adr/ADR-0002-web-foundation.md` exists it is the source for the config
path, the spec directory and the pinned version, and this paragraph cites it instead of naming
them.

The Chrome extension's suite is `extension/playwright.config.ts`, with specs in
`extension/e2e/*.spec.ts`, run by `npm run e2e` in `extension/`, and ADR-0003 is its source. It
runs in one project, not the matrix below, until its first surface, because an extension with no
page has nothing to lay out at a width, a theme or a direction. Its output goes to
`evidence/<ev>/extension/e2e/<pass>/`, by the gate command below with `cd extension` in
place of `cd web` and `EV` set to that directory. Its browser is Playwright's chromium, through `channel: "chromium"`, because branded
Chrome ignores `--load-extension` and the headless shell cannot run extensions.

### The layout projects

A second set of projects, named `layout-<case>`, carries what
[Responsive and bilingual, tested every run](ui-pass.md) asks
beyond the matrix: one width between each pair, a landscape phone, 200% zoom, and the longest
locales, Bahasa Indonesia and Tagalog at 320, 360, 768, 1024 and 1440 in both themes. The
longest-locale projects are generated from the matrix's width and theme lists, so that
section's screenshot in the longest locale exists at every width. The test plan chooses the
widths between each pair. Reduced motion, offline and a throttled connection are set per test
(`reducedMotion`, `context.setOffline`, a DevTools protocol session on Chromium), not as
projects.

### The outputs of a pass

| Output | Where | Notes |
|---|---|---|
| Console log and exit code | `run.log` | The list reporter, one line per case, then `exit N` |
| Counts | `results.json`, its `stats` | expected, unexpected, skipped and flaky. A count in a test log is read from here. |
| Report | `report/index.html` | `PLAYWRIGHT_HTML_OPEN=never`, because a report that opens and serves itself is a command that never returns |
| Traces | `artifacts/<test>/trace.zip`, one per case | `--trace=on` for every gate run. Playwright's trace viewer is for a person reading a trace, and no agent runs it: it opens an interactive viewer, the hazard the Report row names. An agent reads a case from `run.log`, `results.json` and the screenshots. Traces carry tokens and bodies, so the data rule under [The MCP session](playwright-mcp.md) covers them. |
| Screenshots | `artifacts/<test>/<surface>-<case>-<project>.png` | Saved by the spec through `testInfo.outputPath(...)`, named as [Evidence](#evidence) says, for example `queue-sort-360-dark-ar.png` |

The command-line flags and the environment variables take precedence over the reporter and
output settings in the config, so the command works with whatever config ADR-0002 writes.
`playwright-report/` and `test-results/` stay in `.gitignore` for a run that forgets them.
