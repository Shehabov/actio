# .actio

The swarm's shared memory and its scripts. Every run an agent performs leaves its working
record here, so a run can be inspected after the fact without reading a transcript, and the
node scripts that open, check, verify and close a run live beside it.

```
.actio/
├── README.md                  this file
├── bin/                       node only, no dependencies
│   ├── run.mjs                open, next, dispatch, ledger, handoff, snapshot, close
│   ├── ledger-hook.mjs        the SubagentStart and SubagentStop hook: dispatched and returned rows
│   ├── verify.mjs             lint, typecheck, test, build and db:test once per tree
│   ├── bugs.mjs               the register as a tool: brief, guard, next-id, open-index
│   ├── utilisation-check.mjs  the utilisation check
│   ├── sync-gates.mjs         copies gate results from the owners' handoffs into run.json
│   ├── db-test.mjs            the offline database proof, with db-test-shim.sql
│   └── db-test-shim.sql
├── bugs/
│   ├── surfaces.json          surface tags, class tags and the path globs bugs.mjs matches on
│   └── history/               dated history moved out of BUGS.md entries, BUG-NNNN.md
├── TEMPLATE/
│   ├── handoff.json           the handoff skeleton
│   └── lanes/                 micro.json · standard-ui.json · standard-db.json · full.json
└── runs/                      git-ignored
    ├── .active                the id of the run the hook writes to
    └── <run-id>/              one directory per run
        ├── run.json           orchestrator: lane, plan, gates (results synced from handoffs)
        ├── ledger.md          append-only; the hook writes dispatched and returned
        ├── report.md          the closing report for Shehab
        ├── <agent>/handoff.json   plan, checks, findings, gates; a later pass writes handoff-stage<N>.json
        ├── <agent>/<deliverable>  ADR, task briefs, spec, string slots, strings, brief slices, rollback, release note
        └── evidence/          command output, screenshots, traces, the verify bundle
```

Run id is `<yyyy-mm-dd>-<short-slug>`, for example `2026-10-07-privacy-preview`.
Timestamps come from the shell, never invented. The full tree of one run, with every
deliverable named, is in [`../docs/WORKFLOW.md`](../docs/WORKFLOW.md#run-artefacts).

## Rules

- An agent that produced no `handoff.json` did not run, whatever its transcript says. A
  handoff still at `status: working` is a checkpoint, not a result.
- Every path listed in a handoff's `produced` must exist on disk and be non-empty. A missing
  path is a utilisation finding, not a rounding error.
- Evidence is a file. A claim in prose that something passed is not evidence.
- `ledger.md` is append-only. Correct an entry by appending a `correction`, never by editing
  history.
- Runs are kept on disk and never deleted. Git ignores `.actio/runs/`, so evidence blobs stay
  out of history; the register, the ADRs and the release note carry what matters. They are
  the audit trail for a product whose entire claim is that nothing closes without proof.
- Nothing is a `plan.md` or a `review.md` any more. The plan, the self-check and the findings
  are fields of the handoff.

## Scripts

All of them run on node 24 with built-ins only, from the repository root. `run.mjs`
subcommands print at most about 25 lines.

| Script | Run by | Does |
|---|---|---|
| `bin/run.mjs open <slug> --lane <micro\|standard-ui\|standard-db\|full> [--no-ships]` | orchestrator | Creates the run from `TEMPLATE/lanes/<lane>.json`, sets `runs/.active`, runs the scriptable toolchain pre-flight into `evidence/toolchain-preflight.log`, and prints what is still to be filled in |
| `bin/run.mjs next [<run>]` | orchestrator, at every stage boundary | Syncs gates, runs the compact utilisation check, prints one line per gate, the blocking and advisory findings, and the stages now due with their recommended model |
| `bin/run.mjs dispatch <run> <agent> [--stage N]` | orchestrator | Prints the dispatch prompt from the plan entry, with the agent's brief slice inlined. Never writes the ledger: the hook does |
| `bin/run.mjs ledger <run> <event> <agent> <detail...>` | orchestrator | Appends one ledger row with the shell's UTC time |
| `bin/run.mjs handoff <path>` | every agent, before it returns | Validates a handoff against the schema in `actio-agent-protocol`. Exit 0 valid, 1 invalid, one line per problem |
| `bin/run.mjs snapshot <run>` | makers and gate owners | Commits the whole working tree to `refs/actio/snapshots/<run>/<n>` without touching the index, the tree or the stash, and prints the sha. Gates record the snapshot they judged |
| `bin/run.mjs close <run> [--confirm]` | orchestrator | Says whether `run-closure` can pass and what is missing; `--confirm` appends `run closed` and clears `runs/.active` |
| `bin/ledger-hook.mjs` | Claude Code, as a hook | On `SubagentStart` and `SubagentStop`, appends a `dispatched` or `returned` row to the active run's ledger for the sixteen swarm roles. Never blocks, never prints, always exits 0 |
| `bin/verify.mjs [--run <id>] [--force] [--only web,extension,db] [--e2e]` | engineering-lead; others reuse the bundle | Runs whichever of `lint`, `typecheck`, `test` and `build` each workspace defines, and `npm run db:test` when `supabase/` exists, once per tree key. Writes `evidence/verify/<key>/` and `summary.json`, or `.actio/verify/` with no run. A second call for the same key prints the bundle and runs nothing unless `--force` |
| `bin/bugs.mjs index \| surfaces \| brief \| guard \| next-id \| open-index \| lint` | bug-historian | Reads `BUGS.md`, never writes it. `brief` writes the whole brief and one slice per agent; `guard` runs every briefed detection command against head and base and exits 0 clean, 1 repeat found, 2 needs judgement; `next-id` and `open-index` serve the record pass |
| `bin/sync-gates.mjs <run-dir \| run-id> [--dry-run] [--json]` | `run.mjs next`, or the orchestrator by hand | Copies each gate result, `pass`, `fail` or `n/a` with a reason, from its owner's handoff into `run.json`. Never decides a gate |
| `bin/utilisation-check.mjs [<run-dir> \| <run-id>] [--json] [--compact] [--closing]` | `run.mjs next` and `close`, or the orchestrator by hand | The utilisation check. Blocking findings exit 1; advisory findings are printed and never fail the run on their own. Run the sync first |
| `bin/db-test.mjs`, or `npm run db:test` at the root, with its pgTAP shim in `bin/db-test-shim.sql` | backend-engineer while it iterates, `verify.mjs`, and every agent that proves the database offline | Offline Postgres through PGlite: real Postgres compiled to WebAssembly, no Docker. Applies `supabase/migrations/*.sql` in filename order, then `supabase/seed.sql`, onto a Supabase-shaped bootstrap with the `anon`, `authenticated` and `service_role` roles and `auth.uid()` and `auth.jwt()`, then runs `supabase/tests/*.test.sql` under a pgTAP-compatible shim and prints TAP. Exits 0 when every test passes, 1 on any failing assertion or SQL error, 2 when there are no migrations. `--only <file>` runs one test file, `--reverse <file>` proves a reverse script against the newest migration, `--json` prints one object, `--help` prints usage. Its output is evidence, labelled as PGlite on its first line, so save it by calling the script directly rather than through `npm run`, whose banner comes first; it does not replace pgTAP on the Supabase project |

The loop these artefacts record is defined in
[`../.claude/skills/actio-agent-protocol/SKILL.md`](../.claude/skills/actio-agent-protocol/SKILL.md).
Lanes, the stage routine and the utilisation check codes are in
[`../.claude/skills/actio-orchestration/SKILL.md`](../.claude/skills/actio-orchestration/SKILL.md).
The flow between agents is in [`../docs/WORKFLOW.md`](../docs/WORKFLOW.md).
