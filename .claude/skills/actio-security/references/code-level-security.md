# Code-level security rows

Moved verbatim from the old `actio-code-analysis` skill, which carried a security section that duplicated this catalogue. Under the review slicing `security-analyst` is the sole owner: `code-analyst` no longer files these. Read when the diff has user input reaching a fetch, a redirect or a secret comparison, an RPC taking a whole row, a view over free text, or a policy or definer function (the RLS privilege rows).

## 2. Security

| Hunt for | Signature |
|---|---|
| Injection | String-built SQL inside a function body, a `format()` without `%I` or `%L`, `eval`, an unsanitised value reaching a shell |
| Missing authorisation | A table reachable with no policy covering the command, or an Edge Function trusting a client-supplied identity instead of the verified JWT. **Every table, every command.** |
| Mass assignment | An `update` policy with no `with check`, or an RPC taking a whole row as jsonb and writing it unfiltered |
| Secrets in code or logs | A key, token or password literal. A log line containing a phone number, a name, or a free-text response. |
| Personal data in a URL | An identifier or a phone number in a query string. It lands in access logs and in referrers. |
| Unsafe deserialisation | Untrusted jsonb written straight into a typed column, or a webhook body parsed without schema validation |
| SSRF | A user-supplied URL fetched server side |
| Open redirect | A `next` parameter that is not validated against an allowlist |
| Timing leak | An equality check on a secret that is not constant time |
| Missing rate limit | An endpoint that sends a message, or that can be used to enumerate |

## RLS privilege rows

The class that replaces most of the old data-layer list, and the one a general scan never
finds. Every hit here is at least a **major**, and most are blockers.

| Hunt for | Why it hurts | Fix |
|---|---|---|
| `security definer` without `set search_path = ''` | A caller can shadow an object and run their own code as the definer | Pin it, and schema-qualify every reference in the body |
| A view over protected data without `security_invoker = on` | It runs as its creator, silently bypassing the caller's policies | Set it on every view over a protected table |
| A new table with no `enable row level security` | Open the moment anything is granted | Enable it in the same file that creates the table |
| RLS enabled with no policy | Denies everything, looks like a bug, gets "fixed" by disabling RLS | Write the policy in the same migration |
| Policies for `select` only | `insert`, `update` and `delete` fall to a broad grant added later to unblock someone | All four written explicitly, even where one is `false` |
| `using` without `with check` on an update policy | A row can be updated into a state the caller could not have selected | Always both |
| A `grant` on a base table holding response, cohort or protected data | Every threshold function above it becomes decoration | Revoke, and expose only the security-definer reporting surface |
| `service_role` outside Edge Function secrets | It bypasses every policy. In a client bundle it is a full breach. | Blocker, always, no discussion |

## Other rows moved with them

| Defect | Why it matters |
|---|---|
| A view over free text without `security_invoker = on`, a grant on the raw column, or a client grant on the reworded view (inert under `security_invoker`) | I3 |

- An error message that leaks internals to the client.
- A failure path with no observability: nothing logged, no metric, no way to know at 2am.
