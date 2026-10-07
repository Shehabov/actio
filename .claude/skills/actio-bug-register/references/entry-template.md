# Entry template, detect grammar and history

Read before writing or correcting any `BUGS.md` entry.
The register's own `## Entry format` and `## Classes` sections stay the source for the field
meanings and the class list; this file is the layout the script parses.

## The entry (at most 40 lines and 2,560 bytes)

````markdown
### BUG-NNNN · One line saying what broke, sentence case

| | |
|---|---|
| Status | open |
| Raised by | qc-engineer, stage 7 |
| Raised on | 2026-10-07 |
| Run | 2026-10-07-issue-reassignment |
| Surfaces | db, issues |
| Component | `supabase/migrations/20261007120000_close_guard.sql` |
| Agent at fault | backend-engineer |
| Class | state-machine |
| Severity | blocker |
| Evidence | `.actio/runs/2026-10-07-issue-reassignment/evidence/qc/close-without-evidence.log` |
| Binds | backend-engineer, code-analyst, qc-engineer |
| Rule | R-NN |
| Repeat of | none |
| History | `.actio/bugs/history/BUG-NNNN.md` |

**What happened.** At most four wrapped lines. The observable defect, not the story.

**Why it got through.** At most four lines. Name the gate that should have caught it and the
hole in that gate (rubric, catalogue, matrix, checklist, detection).

**The rule this produces.** The class-level rule, or "None new. R-NN covers it", with how
this entry widens its reading.

**How to detect it next time.** One line saying what the block checks.

```detect
stack: sql
git grep -nE "update issue set status *= *'closed'" -- supabase/migrations
```
````

| Row | Rule |
|---|---|
| `Raised on` | The shell's date (`date -u +%F`), never typed from memory |
| `Surfaces` | Tags from the closed list in `.actio/bugs/surfaces.json` only. `bugs.mjs surfaces --paths <component paths>` proposes them. Add a cross-surface tag when the class binds wider than the path (a privacy rule written in a design spec is `design, privacy`) |
| `Agent at fault` | Routing, not blame. The role whose output carried the defect; where the brief, the spec or a skill was wrong, that role, or `none, spec defect` |
| `Binds` | Agent names, comma-separated, or `every agent`. Who must change behaviour so it does not recur. The script routes slices from this row |
| `Rule` | `R-NN` or `none` |
| `Severity` | `blocker`, `major`, `minor`, `nit` |
| `History` | Present once the entry has any dated paragraph. The file must exist (`bugs.mjs lint` checks) |
| `Reopened` | Optional one-line row, `yyyy-mm-dd, run-id`, when a closed entry reopens |

## The `detect` block

Exactly one fenced block whose info string is `detect`. It always holds the current detection.
A correction replaces it in place and the old block moves, dated, to the history file. One item
per line; blank lines and lines starting `#` are ignored.

| Line | Meaning |
|---|---|
| a command | Run by `bash -c` (Git Bash on Windows) from the repository root, exactly as written, at head and at base. Each output line is a hit |
| `expect: empty` or `expect: <text>` | What the command above prints on a healthy tree. Default `empty` |
| `judgement: <question>` | A check no command can decide. The guard lists it and the agent answers it in `checks[]` |
| `stack: sql \| ts \| md \| any` | The stack the command targets. A grep for another stack's syntax returns nothing for the wrong reason |
| `module: .actio/bugs/detect/BUG-NNNN.mjs` | Documentation only. When that file exists it replaces the commands |

A command must be runnable with the toolchain in `actio-agent-protocol` and read-only. The
script refuses, and the guard lists for judgement, any command that:

- holds a placeholder (`<files>`, `<run-id>`, a bare `...`);
- writes, deletes, fetches or changes git state (`rm`, `mv`, `tee`, a `>` redirect other than
  to `/dev/null`, `curl`, `sed -i`, `git checkout|stash|commit|add|reset|...`, `npm install`,
  `npx`);
- targets the wrong stack (python, `raise BelowThreshold`);
- names a path under `.actio/runs/` that does not exist. Run folders are gitignored and get
  deleted: never make a detection depend on one. Commit a module instead.

Exit codes: a `grep`-style exit 1 with no output is silent; exit 2 or more, 127, or a timeout is
an error, which is never a pass. Line numbers are stripped before head is compared with base,
so a hit that only moved is not new.

### Detection modules

When a check needs more than one command (parsing JSON, reading a run, comparing two files),
commit `.actio/bugs/detect/BUG-NNNN.mjs`:

```js
// Node 24 ESM, built-ins only, read-only.
export function detect({ root, ref }) {
  // return every offending location as a string; [] when healthy
  return { hits: [] }
}
export const proof = {
  bad: { 'web/src/app/page.tsx': 'export const x = "#00BFC4"\n' },
  good: { 'web/src/app/page.tsx': 'export const x = "var(--vega)"\n' },
}
```

The module takes precedence over the block's commands. `proof` lets `bugs.mjs proof BUG-NNNN`
prove it with no refs.

## Two-sided proof

Before an entry with a new or corrected detection is written:

```
node .actio/bin/bugs.mjs proof BUG-NNNN --bad <ref with the defect> --good <ref with the fix>
```

It must print `two-sided`: the detection fires on the defect and is silent on the healthy
state. The refs are commits or `run.mjs snapshot` shas (the maker's snapshot before the fix is
the defective ref). Paste the printed line into the entry's history file under the date, and
cite it in `checks[]`. A detection that cannot be proved is not published.

The entry is not yet in `BUGS.md` when you prove it: write it, run `proof`, and correct it
before you hand off. `bugs.mjs index` shows `detect:cmd` for a parsed block and `dead` for a
refused one.

## The history file

`.actio/bugs/history/BUG-NNNN.md`, append-only, oldest first:

```markdown
# BUG-NNNN history

## 2026-10-07 · Raised
Run 2026-10-07-issue-reassignment. Proof: `BUG-NNNN  defective: hit  healthy: silent  two-sided`.

## 2026-10-09 · Fixed
`supabase/migrations/20261009090000_close_guard_fix.sql`. Evidence: `.actio/runs/.../evidence/qc/close.log`.
```

Headings, one per event: `Raised`, `Fixed`, `Reopened`, `Recurred`, `Detection corrected`
(with the old block verbatim), `Closed`, `Verified`. Never edit a past section.
