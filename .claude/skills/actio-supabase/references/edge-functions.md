# Edge Functions

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before writing, deploying or proving any Edge Function.

## Edge Functions

For what the database should not do: outbound messaging, provider webhooks, token minting,
anything with a secret.

Each lives at `supabase/functions/<name>/index.ts`. It is deployed with `deploy_edge_function`
and proved by calling its URL, base from `get_project_url`, with curl or a node fetch script,
reading `get_logs` for the same calls. There is no local Deno and no local serving, so a
function is only ever proved deployed on the dev project. An idempotency proof sends the same
request twice to the deployed function and counts the rows through `execute_sql`.

| Function | Rule |
|---|---|
| `send-invite` | Idempotent on `(employee, cycle, template, stage)`. Messaging is billed per message, so a retry that double-sends costs money as well as trust. |
| `webhook-delivery` | Idempotent on the provider's message id. Providers redeliver, routinely. |
| `survey-token` | The only place the signing secret is read. Never logs a token. |

All three: no personal data in a log line, no phone number in a URL, and a dead-letter row
rather than a silent drop. The secrets they read are set by Shehab in the dashboard, as the
Toolchain section says.
