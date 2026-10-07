# Task brief template

Read when writing a task brief or a remediation brief. This is the one brief shape: it
replaces the two that `tech-architect.md` and `actio-architecture` used to carry.

This is the artefact `frontend-engineer` and `backend-engineer` build from. It must be
implementable without a follow-up question. If the implementer has to ask, the brief was
incomplete.

Path: `.actio/runs/<run-id>/tech-architect/brief-<frontend|backend>.md`. A remediation
brief after an `eroded` verdict is `tech-architect/brief-remediation-<agent>.md`, same shape.

A brief cites the ADR and the contract by path and section and does not restate their
tables. Where the two seem to differ, the ADR wins and the implementer raises it. Aim for at
most about 10 KB: a longer brief is restating the ADR, the contract or a skill. Commands in a
brief are checked, not rehearsed: the script exists in the package.json named and the tool is
in the toolchain. Run a command only when the brief quotes its expected output.

```markdown
# Brief: <frontend|backend>-engineer · run <run-id>

**For.** <agent>, plan entry stage <N>.
**ADRs that bind this.** docs/architecture/adr/ADR-NNNN-<slug>.md, decisions by number
**Contract.** docs/architecture/contracts/<resource>.md, the sections in scope
**Invariants that bind this.** <I-numbers, or none>

## Build
The numbered list of changes, each naming the file or module. A database change names
each hand-authored migration, supabase/migrations/<yyyymmddhhmmss>_<slug>.sql, one
concern per file, applied through the Supabase MCP as actio-supabase states. Never a
schema diff, never a supabase/schemas/ file.

## Contract
The contract file and its sections. Implement it field for field. A deviation needs an
ADR from me first.

## Invariants you must not break
One line per invariant: its number, its enforcement point in the database, its test.
I1 reporting threshold, enforced by a security-definer function over revoked base tables.
   Test: supabase/tests/invariants.test.sql
I5 no close without evidence, enforced by the before update trigger.
   Test: supabase/tests/state_machine.test.sql

## Keys for ux-writer
Every message_key, <field>_label_key and template key this change introduces, each with
the facts its string must state: where each number comes from and its base n, the reader,
the channel. Both sides wire the key; neither waits for the string.

## Acceptance criteria
Numbered. Checkable by reading output or running a command. No criterion says "works".
A criterion for a screen names English and Arabic.

## Evidence to produce
The exact files, under .actio/runs/<run-id>/evidence/<backend|frontend>/, and what each
must show. For the back end, the names in the Toolchain section of actio-supabase: the
PGlite run, pgTAP on the project, list_migrations, list_tables and get_advisors output,
and `backend-engineer/reverse.md`, the written reverse of every migration.

## Out of scope
Named, so nobody reads the gap as an oversight.

## Open questions
Questions to me, not around me: raise them as a blocker with `needs: tech-architect`, and
say what blocks on the answer and what to build meanwhile.
```

## Worked example

```markdown
# Brief: backend-engineer · run 2026-09-20-privacy-preview

**For.** backend-engineer
**ADRs that bind this.** ADR-0004
**Invariants that bind this.** I1, I2, I3

## Build

One read endpoint that returns the four figures the privacy preview screen states, each
computed for the requesting employee rather than illustrative.

## Contract

`GET /api/cycles/{cycle_id}/privacy-preview/`

Auth: employee token. An employee may only request a cycle they are in.

Both payloads below are returned to **the employee the cohort is about, on an employee
token, and to no other reader**. `cohort_size` on a manager-facing endpoint is the leak
I1 forbids. Do not copy these shapes onto a manager path.

200, cohort at or above threshold:

    {
      "cohort_size": 23,
      "reporting_threshold": 5,
      "manager_can_filter_by": ["site", "tenure_band"],
      "manager_can_filter_by_label_keys": ["filter.site", "filter.tenure_band"],
      "free_text_treatment": "reworded_names_removed",
      "free_text_treatment_label_key": "free_text.reworded_names_removed",
      "below_threshold": false
    }

200, cohort below threshold:

    {
      "cohort_size": 4,
      "reporting_threshold": 5,
      "manager_can_filter_by": ["site", "tenure_band"],
      "manager_can_filter_by_label_keys": ["filter.site", "filter.tenure_band"],
      "free_text_treatment": "reworded_names_removed",
      "free_text_treatment_label_key": "free_text.reworded_names_removed",
      "below_threshold": true
    }

Returning 200 with a reduced payload rather than 403, because the screen must still
render and must still tell the employee what will happen.

| Error | Status | Body |
|---|---|---|
| Cycle not found, or employee not in it | 404 | `{"error": {"code": "not_found", "message_key": "error.not_found", "fields": {}, "trace_id": "…"}}` |
| Cycle closed | 409 | `{"error": {"code": "cycle_closed", "message_key": "error.cycle_closed", "fields": {"closed_on": ["2026-03-14"]}, "trace_id": "…"}}` |

`manager_can_filter_by` is read from tenant configuration, never hardcoded.

## Invariants you must not break

- I1: `cohort_size` is the employee's own cohort. It is disclosed to that employee about
  themselves, which is not a report about others, but it must never be reachable by a
  manager through this or any other endpoint.
- I2: the filter list is what a manager *may* select, not what would be permitted for this
  cohort. Do not leak whether a particular filter would breach the threshold.
- I3: `free_text_treatment` is an enum, not prose. Copy is the writer's job.

## Keys for ux-writer

- `error.not_found`; `error.cycle_closed`, which states the closing date from `fields.closed_on`.
- `filter.site`, `filter.tenure_band`, `free_text.reworded_names_removed`: employee reader,
  web and WhatsApp.

## Acceptance criteria

1. Every figure computed live for the requesting employee. No constant in the response
   except `reporting_threshold`.
2. A cohort of exactly 4 returns `below_threshold: true` and does not error.
3. A manager token on this endpoint returns 403, tested.
4. Privacy invariant tests cover 1 to 3.
5. No N+1. One query for the cohort, one for tenant config, asserted in the test.
6. Every function, view and grant this needs lands as a hand-authored migration in
   `supabase/migrations/`, one concern per file, applied and proved through the Supabase MCP
   as `actio-supabase` states. Evidence under `evidence/backend/`: `db-test-pglite.tap`,
   `pgtap-project-invariants.tap`, `list-migrations.json`, `list-tables.json`,
   `advisors-security.json` and `advisors-performance.json`.

## Out of scope

- The screen. The copy. The WhatsApp variant.
- Changing the threshold or its configurability. See ADR-0004.

## Open questions

Cohort size can change between the preview and submission. Raised with Shehab as a
product decision. Build the live figure; the freeze behaviour lands in a later run if he
picks it.
```
