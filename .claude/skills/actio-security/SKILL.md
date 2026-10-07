---
name: actio-security
description: "The Actio data and code security catalogue. Use on every diff, every build and every commit, and before any release. Covers the vulnerability classes that ship routinely in AI-assisted code: exposed keys, open database endpoints, client-side authentication, IDOR and broken access control, injection, insecure storage, missing headers, absent rate limiting, hallucinated packages, known CVEs, dangerous functions, missing error handling and absent logging. Supabase-specific throughout."
---

# Security

The catalogue `security-analyst` works. Every class here has shipped in a real product, most
of them repeatedly, and most of them because the code was written fast and nobody looked.

**Actio's threat model is not generic.** An employee answers honestly only if they believe
their manager cannot see who said what. A leak here does not cost a password reset, it
costs the product its entire claim and the person their job. Treat every finding in
sections A, B and F as blocking by default.

Sources: the vibe coding security checklist at `vibe-coding-checklist.notion.site`, the
OWASP Top 10, and Actio's own invariants in `actio-architecture`.

---

## How to run it

On every diff, in this order. The order is deliberate: a critical in pass 1 or 2, secrets
(B) or exposure (F), makes the rest moot, so stop and report rather than completing the
sweep. The gate fails on that finding, the handoff names the passes not yet run, and the
whole sweep runs on the resubmission.

| # | Pass | Tooling |
|---|---|---|
| 1 | Secrets and keys | `git diff` scan, plus history |
| 2 | Exposure and configuration | `get_advisors` for type `security` and type `performance`, `list_tables`, RLS state and bucket policies queried through `execute_sql` |
| 3 | Authentication and authorisation | policy review, role matrix, role-switched `execute_sql` probes, the same requests against the project's PostgREST URL |
| 4 | Injection | read every string that reaches SQL, a shell or the DOM |
| 5 | Dependencies | `npm audit`, lockfile diff, package existence |
| 6 | Data handling | storage, logs (`get_logs` for Edge Functions), URLs, headers, CSRF, rate limits |
| 7 | Robustness | error paths, logging, dangerous functions |

Every pass records the command or the Supabase MCP call and its output as evidence,
including the passes that found nothing. A clean pass is evidence; an unrun pass is a gap.

Toolchain, a missing MCP and the evidence rules are in `actio-agent-protocol`. Do not restate them.

Database passes run on the project through the MCP and only read or probe: `get_advisors`,
`list_tables`, and `execute_sql` wrapped as `begin; ... rollback;`, with `set local role anon`
or `set local role authenticated` and `set local request.jwt.claims` inside that transaction
for every role check. One probe per call, because the first error aborts the transaction.
The offline `npm run db:test` run (`node .actio/bin/db-test.mjs`, PGlite, no Docker) is
evidence too, labelled as PGlite, and never stands in for a probe on the project.

---

## The catalogue

One line per class. Full text, queries and probes are in the reference in the last column; read it when the diff touches what its trigger in the References table says. Severity here is the catalogue's own; the mapping to the handoff ladder is under Findings.

| Class | Hunt for | Severity | File |
|---|---|---|---|
| A1 Client-side authentication | A client check gates what is fetched; `getSession()` authorises | Critical | auth |
| A2 Missing authorisation, IDOR | No policy per command; update with no `with check`; an id trusted from the body | Critical | auth |
| A3 Broken access control | RLS disabled to "fix" deny-all; a table with no RLS | Critical | auth |
| A4 Weak session handling | Respondent session outlives the cycle; a refresh token; sign-out leaves storage | High | auth |
| A5 Bypass paths | Any unauthenticated route into the data | Critical | auth |
| B1 Hard-coded credentials | A secret literal in the tree or in history | Critical | secrets-injection |
| B2 Exposed keys | `service_role` outside `supabase/functions/` | Critical | secrets-injection |
| C1 SQL injection | `execute` on a concatenated string | Critical | secrets-injection |
| C2 XSS | `dangerouslySetInnerHTML` or `innerHTML` on free text | High | secrets-injection |
| C3 Command injection | A user value reaching a shell | Critical | secrets-injection |
| C4 Dangerous functions | `eval`, `new Function`, `exec`, a dynamic `import()` | Critical | secrets-injection |
| D1 Insecure client storage | A token, personal data or answers left on a shared handset | High | data-handling |
| D2 Weak password storage | A custom credential table, `md5` or `sha1` | Critical | data-handling |
| D3 Sensitive data in URLs and logs | A phone, name, free text or token | High in Actio | data-handling |
| D4 Missing headers | CSP, HSTS, `nosniff`, `frame-ancestors` | Medium | data-handling |
| D5 No CSRF protection | A cookie-authenticated state change | High | data-handling |
| D6 Missing rate limiting | Message sends, token validation | High | data-handling |
| E1 Hallucinated packages | A new dependency that is not real or not the one intended | High | dependencies |
| E2 Known CVEs | `npm audit` critical or high | High | dependencies |
| E3 Insecure deserialisation | Unvalidated JSON into a typed column or from a webhook | High | dependencies |
| F1 Open database endpoints | RLS off; RLS on with no policy; probes that read what they must not | Critical | exposure |
| F2 Storage buckets | A public evidence bucket, no policy, a long-lived signed URL | Critical | exposure |
| F3 Environment and configuration | A secret in `NEXT_PUBLIC_*`, CORS `*`, debug on | High | exposure |
| G1 Error paths | An error path that fails open or leaks internals | High | robustness |
| G2 Logging | Security events unlogged; personal data logged | Medium | robustness |
| G3 Version control | A secret in history, no lockfile | Medium | robustness |
| G4 Fragile enforcement | An invariant enforced outside the database and bypassable | Medium | robustness |

---

## Actio-specific

Checked on every diff, in addition to everything above.

| Check | Why |
|---|---|
| `service_role` outside Edge Function secrets | Bypasses every policy |
| A grant on `responses`, `cohorts` or anything in `protected` | Makes the threshold function decoration |
| RLS off, or on with no policy, on any table in `public` | An open endpoint |
| A `security definer` function without `set search_path = ''` | Privilege escalation by object shadowing |
| A view over protected data without `security_invoker = on` | Runs as its creator, bypassing the caller's policies |
| An error naming the filter that tripped a threshold | Lets a manager binary-search to an individual. |
| Free text, a name or a phone number in a log, URL or error | The product's core claim |
| A storage bucket holding evidence marked public | Evidence is attached to an issue and is never public |
| A survey token that is reusable, long-lived, or logged | A shared handset makes each of those a breach |

---

## Findings and severity

One format: a `findings[]` entry in your handoff (`actio-agent-protocol`). `id` `SEC-n`; `where` file:line, or the project object (`public.responses`); `rule` the class (`F1`, `B2`); `what` the defect and why it matters, at most 240 characters; `fix` the concrete change, starting `ROTATE:` when a secret must be rotated (a deleted secret is still leaked); `evidence` a path under `evidence/security/` holding the command and output, query and rows, or request and response. Someone else must be able to reproduce it from what you wrote.

```json
{"id":"SEC-1","severity":"blocker","where":"supabase/migrations/20260921093000_add_export.sql:14","rule":"F1","evidence":"evidence/security/rls-state.txt","what":"The migration disables RLS on public.responses so an export view works. pg_tables.rowsecurity is false: the anon key is in every browser, so every response is world-readable.","fix":"Re-enable RLS in the same migration; build the export as a security-definer function that applies the threshold. ROTATE: no, the anon key is public by design; treat as a disclosure if it reached an environment with real data.","status":"open"}
```

| Catalogue severity | Handoff `severity` | Gate |
|---|---|---|
| **Critical**: data reachable by someone who should not reach it, or code execution | `blocker` | Blocks. No exceptions, no "ship and patch" |
| **High**: a clear path to critical, or a real failure in normal use | `major` | Blocks |
| **Medium**: weakens a defence without opening one | `minor` | Never blocks alone. Logged with an owner and a date. Three in the same area become one `major` that names the pattern |
| **Low**: hardening | `nit` | Logged |

A finding on a path where a leak is unrecoverable (response data, free text, protected cases, a survey token) is at least `major`. Every critical and high is fixed or accepted in writing by Shehab with a reason and a date. You never accept: list it in `decisions_for_shehab`; `status` becomes `accepted` once his written acceptance exists.

---

## The sweep

Run `references/sweep.md` whole on every pass, as the first step of Execute, unless a critical in pass 1 or 2 stops it: one Bash call for the greps, then the database passes through the Supabase MCP, every command and its output saved to `evidence/security/`.

**A sweep with no findings is reported as a sweep with no findings, with the output
attached.** Silence is not the same as a clean result, and the difference is the whole
reason this role exists.

## References

All in `.claude/skills/actio-security/references/`.

| File | Holds | Read when |
|---|---|---|
| `sweep.md` | The grep sweep as one Bash block (B, E, C4, F3, D3, G1), the database passes, the history scan from the last clean point, and the resubmission rules | Every pass, as the first step of Execute |
| `auth.md` | A1 to A5: client-side authentication, IDOR, broken access control, sessions, bypass paths | The diff touches auth, sessions, a route guard, a policy, an Edge Function that takes an id, or any path into the data |
| `secrets-injection.md` | B1 to B2 and C1 to C4: credentials, exposed keys, SQL, XSS, command injection, dangerous functions | The diff adds config, env or keys, or lets user input reach SQL, a shell, the DOM, `eval` or a dynamic import |
| `data-handling.md` | D1 to D6: client storage, password storage, URLs and logs, headers, CSRF, rate limits | The diff touches client storage, logging, URLs, headers, cookies, forms, or anything that sends a message or validates a token |
| `dependencies.md` | E1 to E3: hallucinated packages, CVEs, deserialisation | `package.json` or the lockfile changes, or a webhook or jsonb body is parsed |
| `exposure.md` | F1 to F3: the RLS catalogue queries and role-switched probes, storage buckets, environment and configuration | Every pass (the F1 queries and probes are step 4 of the method), and before any release |
| `robustness.md` | G1 to G4: error paths that fail open, logging, version control, fragile enforcement | The diff touches error handling, logging or where an invariant is enforced |
| `code-level-security.md` | The security rows `code-analyst` used to carry: injection signatures, mass assignment, SSRF, open redirect, timing leaks, the RLS privilege rows, an I3 view | The diff has user input reaching a fetch, a redirect or a secret comparison, an RPC taking a whole row, or a view over free text |
