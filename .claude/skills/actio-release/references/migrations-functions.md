# Migrations, hosting and Edge Functions at release

Read when: the diff touches `supabase/`, you deploy an Edge Function, or the front-end hosting question comes up.

### Migrations

| Situation | Sequence |
|---|---|
| Additive, backward compatible | Apply the migration through the MCP, then release the client |
| Adding a non-null column | Three releases. Add nullable, backfill in batches, then set not null. Never one. |
| Removing a column or a field | Two releases. Stop reading it, deploy, then drop it. |
| Renaming | Never rename. Add the new, dual-write, backfill, stop reading the old, drop it. |
| Index on a large table | `create index concurrently`, outside a transaction block, in a migration of its own. `apply_migration` is reported to wrap each file in a transaction, where that fails, so the rule and its Shehab decision are in `actio-supabase` under Migrations |
| A new table | Its `enable row level security`, its policies and its grants ship in the **same** migration. A migration that adds a table and leaves the policy for later ships an open table. |

Migrations live in `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql` and are the database
source of record. They are hand-authored, forward-only, one concern per file, each with a
written reverse recorded in the run's rollback notes. **Never edit one once it has been
applied**: a correction is a new migration. There is no declarative `supabase/schemas/`
workflow, because generating a migration from it needs `supabase db diff`, which needs the
Supabase CLI and Docker, and neither is used. Schema files, if any exist, are not a source
of record.

A migration that is not backward compatible with the currently deployed client is not
applied. Split it.

### Front end, hosting deferred

Hosting deployment is out of scope until Shehab chooses a target. Until then the front-end
release is `npm ci` at the root and `npm run build` in `web/` and in `extension/`, green, with the build log in evidence,
and the release record carries the line `Front-end hosting: deferred: no target chosen`.
That line is not a release-gate failure. The vendored `deploy-to-vercel`,
`vercel-cli-with-tokens` and `vercel-optimize` skills stay in the repository as reference
only, coupled to no agent, for when a deploy target is chosen.

### Edge Functions

Deployed with `deploy_edge_function` after the schema they depend on, never before, then
verified by calling the function URL (base from `get_project_url`) with curl or a node
fetch script, with logs read through `get_logs`. No local Deno. Secrets are never
committed. The Supabase MCP exposes no secrets tool and the Supabase CLI is not used, so
the release engineer can neither list nor set a secret: each one the code reads is named in
the ADR, Shehab sets it in the Supabase dashboard as the credential owner and confirms it
in writing, and the release engineer verifies it by calling the function and reading
`get_logs` for a missing-variable error. The `service_role` key lives in the Edge Function
environment and nowhere else. It never reaches the client or the repo: a hit for it in
anything the browser downloads stops the release.
