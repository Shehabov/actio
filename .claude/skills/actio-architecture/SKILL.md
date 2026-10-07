---
name: actio-architecture
description: "Design and record Actio system architecture: domain model, system invariants, repository layout, API contracts, ADRs and implementation task briefs. Use when making a technical decision, reviewing whether a change preserves the architecture, or issuing work to the front-end and back-end agents."
---

# Architecture

The architecture of record, and the three artefacts the architect writes: the ADR (a
decision), the contract (the API shape, written once) and the task brief (what the
implementers build from). A brief that leaves the implementer guessing is a defect in this role.

---

## Domain model

Use the product's own language: `Item` for `Issue` is already drift. This is the only copy.

| Entity | Is | Invariants |
|---|---|---|
| `Organisation` | The customer | Owns sites and tenant configuration. May raise the reporting threshold, never lower it |
| `Site` | A physical or organisational unit | Has a time zone. Deadlines use it, labelled, never the reader's |
| `Employee` | A person who answers | May have one legal name: never require a family name. Never identified to a manager |
| `Cycle` | One survey round | Answers after close are not recorded and the reader is told. Rates always with n |
| `Response` | One employee's answers in a cycle | Pooled. Never individually retrievable by anyone in the customer organisation |
| `Cohort` | The group a response is pooled into | Reports only at or above the threshold. Size computed live for the reader |
| `Issue` | A thing that is wrong and can be fixed | Exactly one lane, one named owner, one date. Cannot close without evidence |
| `Status` | `open`, `in_progress`, `overdue`, `closed`, `protected` | Exactly these five, matching `BRAND.md` §1.4. A sixth needs an ADR |
| `Lane` | Who has the authority to change it | `team_lead`, `operations`, `leadership`, `protected`. Derives from authority to change, never from severity |
| `Owner` | The named person accountable | A person, never a team, and must hold authority for the lane |
| `Evidence` | Proof the change happened | A file or a note, attached, timestamped, attributable, immutable once attached |
| `Closure` | The transition to closed | Guarded. Requires evidence. Records who, when, and whether late |
| `ProtectedCase` | Misconduct or safety | Leaves the engagement workflow. No title, detail or assignee in the queue; the row exists so the count reconciles |
| `Update` | What the workforce is told | Written by ux-writer, sent per channel and locale |

| Lane | Can change | Cannot change |
|---|---|---|
| `team_lead` | Workload, one to ones, local practice | Pay, rosters, staffing, career, policy |
| `operations` | Rosters, staffing, shift structure, process | Pay bands, career structure, policy |
| `leadership` | Pay, career, policy, budget | Nothing in scope |
| `protected` | Handled as a case outside the queue | Never routed to a line manager |

**Routing an issue to a lane that lacks the authority to change it is the failure the
product exists to prevent.** Enforce it as a constraint, not as a convention.

---

## System invariants

Not settings: the product's claim, expressed as code. Weakening one is an escalation to
Shehab, never a trade-off under delivery pressure. This table is the invariants register,
amended by ADR only.

| # | Invariant | Enforced where |
|---|---|---|
| I1 | No cohort below the reporting threshold of 5 ever reports | Base tables revoked from `anon` and `authenticated`; a security-definer function applies the threshold before returning anything. RLS is row-level and the threshold is an aggregate property, so a row policy cannot express it |
| I2 | A manager cannot filter below the threshold | The same function and revoke. The filtered set is counted inside the function and refused below the floor, so a manager never reaches the rows to filter them |
| I3 | Free text is returned reworded, with names removed | The raw column has no grant to anyone. A `security_invoker` view rewords it; only the security-definer read function selects from it, after the floor. No client role is granted the view (BUG-0029) |
| I4 | A protected case never appears in the engagement queue | A separate schema with a separate grant, never a flag on `issues`. A flag can be forgotten in a `where` clause; a missing grant cannot |
| I5 | An issue cannot transition to closed without attached evidence | A `before update` trigger, security definer, `search_path` pinned. A trigger, not a policy: this is a rule about a valid transition, not about row visibility |
| I6 | An issue cannot be assigned to a lane that lacks authority for its category | The same trigger, on the lane change, so it holds on assignment and reassignment |
| I7 | Every closure records who, when, and whether it was late | The same trigger writes the closure row. Insert only: no update or delete grant on `closures` |
| I8 | Deadlines are in the site time zone, labelled | `timestamptz` throughout, the site time zone a separate labelled column. Never inferred from the reader |

Each has a pgTAP test under `supabase/tests/`: I1 to I4 in `invariants.test.sql`, I5 to I7
in `state_machine.test.sql`, I8 in whichever owns the deadline table. Mechanisms, file map
and the offline and project runs are in `actio-supabase`; evidence is in `actio-test-protocol`.

---

## Invariant and boundary checklist

One list, two uses. At contract lock it is the plan audit: answer every row against the
brief and contract, then again against the finished artefacts. After a change (only when the
orchestrator plans that pass) it is the review: give each boundary a written `holds` or
`eroded` from the diff. A "can" answered yes is a finding. "The UI prevents it" and "they
can ask" are bad answers.

| # | Boundary | What erosion looks like in a diff |
|---|---|---|
| B1 | Survey ingest to issue store | Raw response text written into an issue field |
| B2 | Issue store to reporting | A query that can return a group below the threshold, or a filter, export, sort or drilldown that reaches one |
| B3 | Issue store to protected-case store | One table, view or RPC serving both. A join between them. A protected row in any count |
| B4 | Free text to any reader | A verbatim comment field, or a name surviving into a payload, export, notification or log |
| B5 | Evidence store to issue status | A write to closed that skips the guarded transition: admin action, bulk edit, migration, cycle rollover, owner deletion |
| B6 | Service to service inside the API | A view reaching past its own service into another's models |
| B7 | API to channel egress (WhatsApp, SMS, web) | A message body assembled client-side, a payload carrying more than the channel needs, a count concatenated into a string |
| B8 | Identity and permission to everything | A permission checked in the view only, or derived from a role name rather than the lane's authority scope |
| B9 | Trust boundary to third parties | Employee response data crossing to a processor with no ADR naming it |

A genuinely new boundary is added to the architecture of record and to this table in the same run.

Questions asked of every change:

1. Which invariant could this quietly erode, lose its database enforcement point, or gain a
   second enforcement point that can disagree with the first?
2. Can a manager reach a group smaller than 5 through any path this opens: export, filter,
   sort, drilldown, a count in a notification?
3. Can an issue reach closed without evidence on any path: admin action, bulk edit, data
   migration, cycle rollover, owner deletion?
4. Does anything emit an affective number per person or team, a sentiment score by another name?
5. Can free text reach a reader verbatim or carrying a name, through any field, export,
   notification payload or log line?
6. Is every enum defined in exactly one place, the client reading `_label_key`s rather than
   mapping keys to English? Does every rate carry its `_n`?
7. Is the contract identical in the frontend and backend briefs, field for field?
8. Does it work on a mid-range Android on a weak connection, over WhatsApp, SMS and web, in
   Bahasa Indonesia, English, Tagalog and Arabic (RTL, single-name users, counts)?
9. Did a constant become a setting (or the reverse), or a second way appear to do what the
   system already does once, without a decision?
10. Did a boundary or the contract move without an ADR? Does the implementation match the brief?
11. What will the implementers ask that the brief does not answer, and what will
    engineering-lead, the four reviewers or qc-lead reject this for?

---

## API contract conventions

| Concern | Convention |
|---|---|
| Naming | Nouns, plural, the domain's language. `/issues/`, `/cycles/`, not `/items/` |
| Errors | One shape everywhere: `{"error": {"code": "<snake_case_code>", "message_key": "error.<code>", "fields": {}, "trace_id": ""}}`. A code, never a sentence: copy is the writer's, and a code with no message is rejected. Edge Functions return it directly; an RPC raises the code (`actio-supabase`) and the data client wraps PostgREST's error into this shape, so a component reads one shape |
| Pagination | Cursor, not offset. Queues are long and rows move |
| Times | ISO 8601 UTC in the payload. The site time zone is a separate labelled field. The client never guesses. The reader sees `14 Mar 2026` in tables and identifiers, `14 March` in running prose, never numeric-only (`BRAND.md` §8) |
| Numbers | Integers where the domain is integral. A rate is a fraction from 0 to 1 named `<name>_rate` with `<name>_n` beside it, always. The client formats the percentage and never derives n |
| Enums | Snake case strings, never integers. Every enum field ships a `<field>_label_key`; the client resolves words from the string catalogue. The label names the actual role, not a tier (`BRAND.md` §5). Lane and status keys are identifiers, never what a reader sees |
| Below threshold | A manager-facing report raises `below_threshold` and returns nothing (I1, I2); `cohort_size` never appears on a manager path. An employee's view of their own cohort (the privacy preview) returns 200 with `below_threshold: true`, because it discloses nothing about others and the screen must still render. No other endpoint uses the second form without an ADR |
| Nullability | Explicit. A field that can be absent is documented as such in the brief |
| Idempotency | Every write a retry could duplicate takes an idempotency key, unique in the database. Messaging is billed per message |

---

## Briefs, ADRs and contracts

- A brief is implementable without a follow-up question. Banned in a brief: "as appropriate",
  "handle correctly", "standard", "etc.". Every criterion is checkable by reading output or
  running a command, none says "works", and a screen's criteria name English and Arabic.
- A brief asks only for tools the toolchain has. A database change is a hand-authored
  migration applied through the Supabase MCP, never a schema diff, never a `supabase/schemas/`
  file, never a local Supabase stack.
- A brief cites the ADR and the contract by path and section and does not restate them.
  Where they seem to differ, the ADR wins and the implementer raises it.
- Both briefs are diffed on every shared field: name, type, nullability, enum value, error code.
- ADRs are sequential, never reused, immutable once accepted, superseded rather than edited.
  The record is `docs/architecture/adr/ADR-NNNN-<slug>.md`; the run folder holds a byte copy.
- If an implementer needs the contract different, the contract changes first, by ADR, then
  both sides change together. An `eroded` boundary gets a remediation brief.

---

## References

| File | Holds | Read when |
|---|---|---|
| `references/adr.md` | The one ADR template, a worked example | Writing or superseding an ADR |
| `references/brief.md` | The one task-brief template (also remediation), a worked example | Writing a task or remediation brief |
| `references/contract.md` | The contract file template | Writing or amending a contract |
| `references/repository-layout.md` | Where product code lives, what the toolchain cannot do | A brief names a path you have not confirmed, or a change adds a folder or workspace |
