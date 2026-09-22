---
name: actio-architecture
description: Design and record Actio system architecture: domain model, system invariants, API contracts, ADRs and implementation task briefs. Use when making a technical decision, reviewing whether a change preserves the architecture, or issuing work to the front-end and back-end agents.
---

# Architecture

The architecture of record for Actio, and the two artefacts the architect produces: the
ADR, which records a decision, and the task brief, which is what the implementing agents
actually build from.

A task brief that leaves the implementer guessing is a defect in this role, not a question
for the implementer.

---

## Domain model

Use the product's own language. An implementation that talks about `Item` and `Status`
instead of `Issue` and `Lane` has already started drifting.

| Entity | Is | Invariants |
|---|---|---|
| `Organisation` | The customer | Owns sites, tenant configuration, the reporting threshold override if any |
| `Site` | A physical or organisational unit: warehouse, contact centre, depot | Has a time zone. Deadlines are stated in the site's time zone, labelled, never the reader's. |
| `Employee` | A person who answers | May have a single legal name. Never require a family name. Identified to the system, never to a manager. |
| `Cycle` | One survey round | Has an open and close date. Answers submitted after close are not recorded, and the reader is told. |
| `Response` | One employee's answers in one cycle | Pooled. Never individually retrievable by anyone in the customer organisation. |
| `Cohort` | The group a response is pooled into | Reports only at or above the threshold. Its size is computed live for the reader. |
| `Issue` | A thing that is wrong and can be fixed | Classified by lane. Has one named owner and one date. Cannot close without evidence. |
| `Lane` | Who has the authority to change it | `team_lead`, `operations`, `leadership`, `protected`. Routing by lane is the product. |
| `Owner` | The named person accountable | A person, never a team. "Operations" is a lane; Budi S. is an owner. |
| `Evidence` | Proof the change happened | A file or a note, attached to the issue, timestamped, attributable |
| `Closure` | The transition to closed | Guarded. Requires evidence. Records who closed it and when, and whether it closed late. |
| `ProtectedCase` | Misconduct or safety | Leaves the engagement workflow entirely. No title, no detail, no assignee in the queue. The row exists so the count reconciles. |

### Routing lanes and their authority

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

These are not settings. They are the product's claim, expressed as code. A change that
weakens one of them is an escalation to Shehab, never a trade-off made under delivery
pressure.

| # | Invariant | Enforced where |
|---|---|---|
| I1 | No cohort below the reporting threshold of 5 ever reports | Base tables revoked from `anon` and `authenticated`; a security-definer function applies the threshold before returning anything. RLS is row-level and the threshold is an aggregate property, so a row policy cannot express it. |
| I2 | A manager cannot filter below the threshold | The same function and the same revoke. The filtered set is counted inside the function and refused below the floor, so a manager never reaches the rows to filter them. |
| I3 | Free text is returned reworded, with names removed | A view with `security_invoker = on` over a revoked base table. The raw column has no grant to anyone. |
| I4 | A protected case never appears in the engagement queue | A separate schema with a separate grant, never a flag on `issues`. A flag can be forgotten in a `where` clause; a missing grant cannot. |
| I5 | An issue cannot transition to closed without attached evidence | A `before update` trigger, security definer, `search_path` pinned. A trigger rather than a policy, because this is a rule about what a valid transition is, not about which rows are visible. |
| I6 | An issue cannot be assigned to a lane that lacks authority for its category | The same trigger, on the lane change, so it holds on assignment and on reassignment alike. |
| I7 | Every closure records who, when, and whether it was late | The same trigger writes the closure row. Insert only: no update or delete grant on `closures`. |
| I8 | Deadlines are in the site time zone, labelled | `timestamptz` throughout, with the site time zone as its own labelled column. Never inferred from the reader. |

Every one of these has a dedicated pgTAP test in `supabase/tests/invariants.test.sql`, run
by `supabase test db`. See `actio-supabase` for the mechanisms and `actio-test-protocol` for
the evidence.

---

## ADR template

One file per decision. Numbered, immutable once accepted. Supersede rather than edit.

Path: `docs/architecture/adr/ADR-NNNN-<slug>.md`, four digits, sequential, never reused.
This is the only home. `.actio/runs/` is gitignored, so the run folder lists the ADR by that
path in `produced` rather than holding a copy.

```markdown
# ADR-0004 · The reporting threshold is a system invariant, not a setting

- **Status.** Accepted
- **Date.** 2026-09-20
- **Run.** 2026-09-20-privacy-preview
- **Invariants touched.** I1, I2
- **Supersedes.** none
- **Superseded by.** none

## Context

The privacy preview screen has to state the smallest group the system will report on. A
customer asked whether the threshold can be lowered for small sites, where a cohort of 5
is rare and the data would otherwise be unusable.

## Options considered

| Option | Consequence |
|---|---|
| Per-tenant configurable threshold | Unblocks small sites. Also means the product cannot state a single number to an employee, and the privacy preview becomes a per-tenant promise the employee cannot verify. |
| Fixed threshold of 5, no override | Small sites see less. The promise is the same everywhere and an employee can check it. |
| Fixed floor of 5, tenant may raise it | Small sites see no more than today. A tenant that wants to be more protective can be. |

## Decision

Fixed floor of 5. A tenant may raise the threshold, never lower it. The floor is a
constant in code, not a column.

## Consequences

- Small sites will have cycles where nothing reports. The empty state has to say so
  plainly rather than look broken.
- The privacy preview can state a number the employee can hold the system to.
- Sales cannot offer a lower threshold as a concession, and that needs saying to them.

## What would make us revisit

A regulatory regime that requires a different floor, or evidence that sites below ~30
people cannot use the product at all, measured rather than anecdotal.
```

---

## Task brief template

This is the artefact `frontend-engineer` and `backend-engineer` build from. It must be
implementable without a follow-up question. If the implementer has to ask, the brief was
incomplete.

Path: `.actio/runs/<run-id>/tech-architect/brief-<frontend|backend>.md`

```markdown
# Task brief · backend · 2026-09-20-privacy-preview

**For.** backend-engineer
**ADRs that bind this.** ADR-0004
**Invariants that bind this.** I1, I2, I3

## What to build

One read endpoint that returns the four figures the privacy preview screen states, each
computed for the requesting employee rather than illustrative.

## Contract

`GET /api/cycles/{cycle_id}/privacy-preview/`

Auth: employee token. An employee may only request a cycle they are in.

Both payloads below are returned to **the employee the cohort is about, on an employee
token, and to no other reader**. `cohort_size` on a manager-facing endpoint is the leak
I1 forbids. Do not copy these shapes onto a manager path.

200, cohort at or above threshold:

```json
{
  "cohort_size": 23,
  "reporting_threshold": 5,
  "manager_can_filter_by": ["site", "tenure_band"],
  "free_text_treatment": "reworded_names_removed",
  "below_threshold": false
}
```

200, cohort below threshold:

```json
{
  "cohort_size": 4,
  "reporting_threshold": 5,
  "manager_can_filter_by": ["site", "tenure_band"],
  "free_text_treatment": "reworded_names_removed",
  "below_threshold": true
}
```

Returning 200 with a reduced payload rather than 403, because the screen must still
render and must still tell the employee what will happen.

| Error | Status | Body |
|---|---|---|
| Cycle not found, or employee not in it | 404 | `{"error": {"code": "not_found", "message_key": "error.not_found", "fields": {}, "trace_id": "…"}}` |
| Cycle closed | 409 | `{"error": {"code": "cycle_closed", "message_key": "error.cycle_closed", "fields": {"closed_on": ["2026-03-14"]}, "trace_id": "…"}}` |

`manager_can_filter_by` is read from tenant configuration, never hardcoded.

## Invariants this must not break

- I1: `cohort_size` is the employee's own cohort. It is disclosed to that employee about
  themselves, which is not a report about others, but it must never be reachable by a
  manager through this or any other endpoint.
- I2: the filter list is what a manager *may* select, not what would be permitted for this
  cohort. Do not leak whether a particular filter would breach the threshold.
- I3: `free_text_treatment` is an enum, not prose. Copy is the writer's job.

## Acceptance criteria

1. Every figure computed live for the requesting employee. No constant in the response
   except `reporting_threshold`.
2. A cohort of exactly 4 returns `below_threshold: true` and does not error.
3. A manager token on this endpoint returns 403, tested.
4. Privacy invariant tests cover 1 to 3.
5. No N+1. One query for the cohort, one for tenant config, asserted in the test.

## Out of scope

- The screen. The copy. The WhatsApp variant.
- Changing the threshold or its configurability. See ADR-0004.

## Open question, not a blocker

Cohort size can change between the preview and submission. Raised with Shehab as a
product decision. Build the live figure; the freeze behaviour lands in a later run if he
picks it.
```

---

## API contract conventions

| Concern | Convention |
|---|---|
| Naming | Nouns, plural, the domain's language. `/issues/`, `/cycles/`, not `/items/`. |
| Errors | One shape everywhere: `{"error": {"code": "<snake_case_code>", "message_key": "error.<code>", "fields": {}, "trace_id": ""}}`. A code, never a sentence, because copy is the writer's. Edge Functions return it directly; an RPC raises the code (see `actio-supabase`) and the front end's data client wraps PostgREST's error into this shape, so a component reads one shape only. |
| Pagination | Cursor, not offset. Queues are long and rows move. |
| Times | ISO 8601 UTC in the payload. The site time zone is a separate labelled field. The client never guesses. |
| Numbers | Integers where the domain is integral. A rate is a fraction from 0 to 1 named `<name>_rate`, with `<name>_n` beside it, always. The client formats the percentage. |
| Enums | Snake case strings, never integers. A wire format a human can read in a log is worth more than two bytes. Every enum field ships a `<field>_label_key` beside it; the client resolves the words from the string catalogue. |
| Below threshold | A manager-facing report raises `below_threshold` and returns nothing (I1, I2). An employee's view of their own cohort, such as the privacy preview, returns 200 with `below_threshold: true`, because it discloses nothing about others and the screen must still render. No other endpoint uses the second form without an ADR. |
| Nullability | Explicit. A field that can be absent is documented as such in the brief. |
| Idempotency | Every write that a retry could duplicate takes an idempotency key. Messaging is billed per message. |

---

## The post-change architecture review

Runs after **every** change, not only new features. This is what the Product Lead asked
for: the architecture is re-examined each time.

Read the diff, then answer these in writing. A yes to any of the first five is a finding.

1. Did a boundary move without an ADR? Logic that was in a service now in a view, a model
   now reaching across an app, a client now knowing something only the server should.
2. Did the API contract change in a way the other side has not implemented?
3. Did any invariant I1 to I8 lose its enforcement point, or gain a second enforcement
   point that can disagree with the first?
4. Did a constant become a setting, or a setting become a constant, without a decision?
5. Did the change add a second way to do something the system already does once?
6. Does the implementation match the task brief, or did it drift under delivery pressure?
7. Is there anything here that would make the product contradict its own claim: a
   sentiment score creeping in, a route that lets a manager filter below the threshold,
   an issue that can close without evidence, a protected case leaking into the queue?

Record the answers in `review.md`. Where the architecture eroded, issue the remediation
task rather than noting it and moving on.
