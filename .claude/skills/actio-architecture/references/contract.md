# Contract template

Read when writing or amending a contract. Moved from `tech-architect.md`, with pagination
corrected from offset to cursor to match the API conventions in `actio-architecture`.

Path: `docs/architecture/contracts/<resource>.md`. One file per resource, every section
filled, written once and consumed by both sides. If an implementing agent needs it
different, the contract changes first, by ADR, then both sides change together.

Every endpoint entry carries: auth and permission, request shape, response shape, ordering,
threshold behaviour, pagination, every status code with its error body, and idempotency.

```markdown
# Contract: issues
Owner: tech-architect · Last ADR: ADR-0007

## GET /api/v1/issues
Auth: session or bearer. Permission: reader must hold the lane's authority scope.
Query: cycle (uuid, required), lane (enum, optional), status (enum, optional),
       cursor (opaque string, optional), limit (int, default 25, max 100)
Ordering: `-due_date`, then `id`. Ordering is server-side only.
Pagination: cursor, not offset. `next_cursor` is null on the last page.
Threshold: any grouping whose n is below the reporting threshold is omitted from
           `results` and counted in `suppressed_groups`. Never returned and masked.

200:
{ "next_cursor": null, "suppressed_groups": 2,
  "results": [ { "id": "…", "title": "Night shift handover is unstaffed",
    "lane": "leadership", "lane_label_key": "lane.leadership",
    "status": "overdue", "status_label_key": "status.overdue",
    "owner": { "id": "…", "name": "Dewi" },
    "due_date": "2026-03-14", "closed_at": null,
    "evidence_count": 0, "response_rate": 0.41, "response_n": 612 } ] }

Every error uses the one shape in `actio-architecture`:
400: { "error": { "code": "invalid_query", "message_key": "error.invalid_query",
       "fields": { "cycle": ["required"] }, "trace_id": "…" } }
401: { "error": { "code": "unauthenticated", "message_key": "error.unauthenticated", "fields": {}, "trace_id": "…" } }
403: { "error": { "code": "lane_not_permitted", "message_key": "error.lane_not_permitted", "fields": {}, "trace_id": "…" } }
404: { "error": { "code": "cycle_not_found", "message_key": "error.cycle_not_found", "fields": {}, "trace_id": "…" } }
429: { "error": { "code": "rate_limited", "message_key": "error.rate_limited",
       "fields": { "retry_after_seconds": [30] }, "trace_id": "…" } }

Idempotency: reads are safe. Every write endpoint takes an `Idempotency-Key` header
             and is unique on it in the database.
```

Every rate field is a fraction from 0 to 1 and ships its `_n` counterpart. Every enum
field ships its `_label_key` counterpart. Dates are ISO 8601 in the payload, and the label
the reader sees renders per `BRAND.md` §8: `14 Mar 2026` in tables and identifiers,
`14 March` in running prose, never numeric-only. Write the example bodies out. Prose about a
shape is not a shape.
