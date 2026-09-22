---
name: actio-security
description: The Actio data and code security catalogue. Use on every diff, every build and every commit, and before any release. Covers the vulnerability classes that ship routinely in AI-assisted code: exposed keys, open database endpoints, client-side authentication, IDOR and broken access control, injection, insecure storage, missing headers, absent rate limiting, hallucinated packages, known CVEs, dangerous functions, missing error handling and absent logging. Supabase-specific throughout.
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

On every diff, in this order. The order is deliberate: a finding in A or B makes the rest
moot, so stop and report rather than completing the sweep.

| # | Pass | Tooling |
|---|---|---|
| 1 | Secrets and keys | `git diff` scan, plus history |
| 2 | Exposure and configuration | Supabase advisors, RLS state, bucket policies |
| 3 | Authentication and authorisation | policy review, role matrix |
| 4 | Injection | read every string that reaches SQL, a shell or the DOM |
| 5 | Dependencies | `npm audit`, `pip audit`, lockfile diff, package existence |
| 6 | Data handling | storage, logs, URLs, headers, CSRF, rate limits |
| 7 | Robustness | error paths, logging, dangerous functions |

Every pass records the command and its output as evidence, including the passes that found
nothing. A clean pass is evidence; an unrun pass is a gap.

---

## A. Authentication and authorisation

### A1. Client-side authentication · Critical

If the decision runs in the browser, the user can read it and skip it.

| Hunt for | |
|---|---|
| A role, permission or tier check in client code that gates data rather than only the view | `if (user.role === 'admin')` deciding what is *fetched*, not what is *rendered* |
| A password or token compared in the client | Any credential comparison outside the server |
| A route guard that is the only thing protecting the data behind it | The API must refuse independently |
| `getSession()` used to authorise | It reads a client-held token. `getUser()` or `getClaims()` verifies with the server. |

**In Actio:** the client may hide a control the reader cannot use. It may never be the
reason they cannot reach the data. RLS decides that.

### A2. Missing authorisation checks, IDOR · Critical

The single most common real-world breach in this class: an object id in a request, and
nothing checking the caller owns it.

- Every table reachable by PostgREST has a policy for **every** command, not only `select`.
- Every `update` policy has both `using` and `with check`. Without `with check` a caller can
  update a row into a state they could not have selected.
- Test the negative: a valid session for site A requesting an id from site B must return
  nothing, not a 403 that confirms the row exists.
- An Edge Function taking an id from the body and trusting it is the same bug with extra
  steps. Derive identity from the verified JWT, never from the payload.

### A3. Broken access control · Critical

- RLS enabled with no policy denies everything, which looks like a bug and gets "fixed" by
  disabling RLS. **Check the fix, not just the symptom.** A commit that disables RLS is a
  blocker regardless of its message.
- A new table with no `enable row level security` is open the moment anything is granted.
- `service_role` anywhere the browser can reach it bypasses every policy in the database.
- Check the Supabase advisors, which name unprotected tables directly.

### A4. Weak session handling · High

| Check | Actio |
|---|---|
| Token generation | Cryptographically random. Supabase Auth handles this; a custom survey token must too. |
| Expiry | The respondent session expires with the cycle, not in 30 days |
| Invalidation | Sign out clears local storage completely. A shared handset is the normal case. |
| Transport | Secure, `HttpOnly` and `SameSite` where cookies are used |
| Fixation | A new session id after privilege changes |
| Refresh | **No refresh token on a respondent session.** There is nothing to steal from a shared device. |

### A5. Authentication bypass paths · Critical

Enumerate every route into the data and confirm each one authenticates: the web app, a
PostgREST call made directly, an Edge Function, a webhook endpoint, a Realtime
subscription, a scheduled job, an export, the storage bucket. A single unauthenticated path
makes the other seven irrelevant.

---

## B. Secrets and keys

### B1. Hard-coded credentials · Critical

```bash
git diff origin/main... | grep -nEi '(secret|token|password|passwd|api[_-]?key|private[_-]?key|bearer)\s*[=:]\s*["'\'']'
git log -p --all | grep -nEi 'service_role|sk_live|-----BEGIN [A-Z ]*PRIVATE KEY'
```

Scan **history**, not only the working tree. A key committed once and removed later is a
key that leaked, and the fix is rotation, not deletion.

### B2. Exposed API keys in client-side code · Critical

Supabase has a specific and much-misunderstood shape here.

| Key | Where it may appear | What protects the data |
|---|---|---|
| `anon` / publishable | The browser bundle. **This is by design.** | RLS, and only RLS. An anon key with RLS off is a public database. |
| `service_role` / secret | Edge Function secrets and server environment only | Nothing. It bypasses every policy. |

```bash
# service_role must never appear in anything the browser downloads
git grep -n 'service_role' -- . ':!supabase/functions' ':!*.md'
```

Any hit outside `supabase/functions/` and documentation is a blocker and a rotation event.
For any third-party key the client needs, proxy it through an Edge Function rather than
shipping it.

---

## C. Injection

### C1. SQL injection · Critical

In Postgres functions the risk is string building inside the body.

```sql
-- Vulnerable: the identifier is concatenated
execute 'select * from ' || tbl || ' where site = ''' || p_site || '''';

-- Correct: %I quotes an identifier, %L quotes a literal, and using passes a parameter
execute format('select * from %I where site = $1', tbl) using p_site;
```

Also: the database role a caller runs as has the minimum privileges it needs, so an
injection that succeeds still reaches nothing it should not.

### C2. Cross-site scripting · High

- Never `dangerouslySetInnerHTML` with anything that originated from a user. Free text from
  a survey is user input even after rewording.
- No `innerHTML`, no `document.write`, no template built by concatenation.
- A Content Security Policy that actually restricts `script-src`, not one that allows
  `unsafe-inline`.
- Sanitise on output, not only on input, because storage is not the only path in.

### C3. Command injection · Critical

Any user value reaching a shell. In this product that is most likely in an Edge Function
shelling out for file handling. Pass arguments as an array, never build a command string.

### C4. Dangerous functions · Critical

The class that exists because the shortest solution is often the unsafe one.

| Never | Instead |
|---|---|
| `eval`, `new Function`, `setTimeout` with a string | Parse it, or use a real expression library |
| `child_process.exec` with interpolation | `execFile` with an argument array |
| A dynamic `import()` built from user input | An allowlist map |
| Postgres `execute` on a concatenated string | `format` with `%I` and `%L`, plus `using` |

A textbook case is `eval` used for arithmetic on user input. It is arbitrary code execution
written to save four lines.

---

## D. Data storage and handling

### D1. Insecure client-side storage · High

Nothing sensitive in `localStorage`, `sessionStorage` or IndexedDB: no tokens beyond the
session Supabase manages, no personal data, no survey answers beyond the offline queue the
design calls for, and that queue is cleared on submit and on sign out. **A shared handset
is the normal case in this product**, so anything left behind is readable by the next
worker on that shift.

### D2. Weak password storage · Critical

Actio does not store passwords. Supabase Auth does, correctly. **The finding here is any
code that starts to.** A custom credential table, a hash written by hand, or anything using
`md5` or `sha1` for a password is a blocker.

### D3. Sensitive data in URLs and logs · Medium, but High in Actio

URLs land in access logs, referrers, browser history and shared screenshots.

- No phone number, employee identifier, name, free text or token in a query string or a
  path segment. The survey token is single-use and short-lived precisely because it
  travels in a URL.
- No free text, name or phone number in any log line, error message, exception or trace.
- Redact before writing, not after.

### D4. Missing security headers · Medium

Set centrally, so every route inherits them rather than each one remembering.

| Header | Value |
|---|---|
| `Content-Security-Policy` | Restrictive, no `unsafe-inline` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` or CSP `frame-ancestors` | Deny, because the survey must not be framed |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Deny what the product does not use |

### D5. No CSRF protection · High

Anywhere a cookie authenticates a state-changing request. Token-authenticated PostgREST
calls are not vulnerable in the same way, but any cookie-based flow is, and so is any
form that posts to an Edge Function.

### D6. Missing rate limiting · High

Applied per route, centrally. In Actio the two that matter most:

- **Anything that sends a message.** Messaging is billed per message, so an unlimited
  endpoint is a financial denial of service as well as a spam vector.
- **Anything enumerable.** A token validation endpoint with no limit lets an attacker walk
  the token space.

---

## E. Dependencies and supply chain

### E1. Hallucinated packages · High

The slopsquatting risk. AI-assisted code routinely imports libraries that do not exist, and
an attacker who registers that plausible name owns the build.

**Every new dependency in a diff is verified to exist and to be the one intended**, by
checking the registry, the repository link, the download count and the publish date. A
package published last week with forty downloads and a name one character from a popular
one is the attack, not a coincidence.

```bash
git diff origin/main... -- package.json | grep '^+' | grep -oE '"[^"]+":\s*"[^"]+"'
```

### E2. Outdated libraries with known CVEs · High

```bash
npm audit --audit-level=moderate
npm audit fix            # then re-run and read what it could not fix
pip audit                # where any Python exists
```

**Every critical and high finding is fixed or explicitly accepted in writing with a reason
and a date.** "It is only a dev dependency" is an acceptance, and it gets written down like
any other.

### E3. Insecure deserialization · High

Untrusted JSON written straight into a typed column, a webhook body parsed with no schema
validation, or any structured input trusted because it arrived in the right shape. Validate
against a schema at every boundary, including between your own services.

---

## F. Exposure and configuration

The class that produces the headline breaches, and the one most specific to this stack.

### F1. Open database endpoints · Critical

**A Supabase project with RLS off is a public database**, because PostgREST exposes every
granted table and the anon key is in the browser by design. This is the single most common
way a product of this shape leaks everything.

```sql
-- every table in a client-reachable schema must have RLS on
select schemaname, tablename, rowsecurity
  from pg_tables
 where schemaname in ('public')
   and rowsecurity = false;

-- and RLS on with no policy is deny-all, which gets "fixed" the wrong way
select c.relname
  from pg_class c
 where c.relrowsecurity
   and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
```

Run the Supabase security advisors on every build and treat every finding as a defect.

### F2. Misconfigured storage buckets · Critical

The Firebase-bucket failure mode, in Supabase Storage form.

- No bucket is public unless the content is genuinely public. Evidence attached to an issue
  is never public.
- Every bucket has storage policies, and they are tested the same way table policies are.
- Signed URLs are short-lived and scoped to one object.
- A file name is not a secret. Never rely on an unguessable path.

### F3. Environment and configuration · High

- No secret in a client-side environment variable. Anything prefixed for the browser is
  public: `NEXT_PUBLIC_*` is shipped to every visitor.
- CORS is an allowlist, never `*`, on anything authenticated.
- Debug and verbose error modes off in production, because a stack trace is a map.
- Default credentials changed, sample data removed, seed accounts disabled.

---

## G. Robustness and maintainability

The user-visible half, and the reason a product feels fragile rather than merely insecure.

### G1. Missing error handling · High

AI-assisted code writes the happy path well and the rest not at all. Every one of these is
a real failure that will occur on a frontline handset:

| Path | Must |
|---|---|
| Network timeout | Retry with backoff, or fail with a stated next step |
| Offline mid-survey | Hold on the device, state it plainly, send on reconnect, never double-send |
| Empty form field | Validate on blur, message inline beside the field |
| Wrong data type | Refuse at the boundary with a code, never coerce silently |
| Upstream 5xx | Degrade to something usable, never a blank screen |
| Partial failure | Render what resolved, label what did not |

A swallowed exception is worse than a crash, because it produces a wrong state nobody sees.

### G2. Logging · Medium

Both directions are defects.

- **Absent:** a failure path with nothing logged, no metric and no way to know at 2am.
- **Excessive or unfiltered:** free text, names, phone numbers, tokens or whole request
  bodies written to a log. Filter at the point of writing.

Every log line carries a correlation id so a support conversation can find the run.

### G3. Version control · Medium

Everything in git, nothing generated committed by hand, no large binary without a reason,
no secret in history, and a lockfile committed so a build is reproducible.

### G4. Fragile architecture · Medium

The finding `code-steward` and `peer-reviewer` also look for, from a security angle: a rule
enforced in one place a future change can route around, two enforcement points that can
disagree, a boundary that exists only by convention. In this product that is specifically
any invariant enforced outside the database.

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
| An error naming the filter that tripped a threshold | Lets a manager binary-search to an individual. Standing rule R-01. |
| Free text, a name or a phone number in a log, URL or error | The product's core claim |
| A storage bucket holding evidence marked public | Evidence is attached to an issue and is never public |
| A survey token that is reusable, long-lived, or logged | A shared handset makes each of those a breach |

---

## Findings

```markdown
### S-03 · Critical · F1 · RLS disabled on public.responses

**Where.** `supabase/migrations/20260921_add_export.sql:14`
**Class.** Exposure and configuration, F1. Open database endpoint.

**What.** The migration adds an export view and disables RLS on `public.responses` to make
it work.

**Why it is critical.** The anon key is in the browser by design and RLS is the only thing
standing between it and every survey response ever submitted. This one line makes the
entire response table world-readable to anyone who opens the bundle and reads the key.

**Proof.**
`select rowsecurity from pg_tables where tablename = 'responses';` returns `false`.

**Fix.** Re-enable RLS in the same migration, and build the export as a security-definer
function that applies the reporting threshold, per the pattern in `actio-supabase`.

**Rotation required.** No, the key is public by design. Yes if the migration reached an
environment with real data, in which case treat it as a disclosure.
```

| Severity | Means | Gate |
|---|---|---|
| **Critical** | Data reachable by someone who should not reach it, or code execution | Blocks. No exceptions, no "ship and patch". |
| **High** | A clear path to critical, or a real failure in normal use | Blocks |
| **Medium** | Weakens a defence without opening one | Blocks only if it accumulates. Logged and scheduled. |
| **Low** | Hardening | Logged |

---

## The sweep

Run whole, every time. Record each command and its output.

```bash
# B. secrets, working tree and history
git diff origin/main... | grep -nEi '(secret|token|password|api[_-]?key|private[_-]?key)\s*[=:]\s*["'\'']'
git grep -n 'service_role' -- . ':!supabase/functions' ':!*.md'

# E. dependencies
npm audit --audit-level=moderate
git diff origin/main... -- package.json package-lock.json | grep '^+' | grep -E '"[^"]+":'

# C4. dangerous functions
git grep -nE '\beval\(|new Function\(|dangerouslySetInnerHTML|innerHTML\s*=|child_process\.exec\('

# F3. client-exposed configuration
git grep -nE 'NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)'

# D3. personal data in logs
git grep -nE 'console\.(log|error)\(.*(phone|free_text|full_name|email)'

# G1. swallowed errors
git grep -nE 'catch\s*\([^)]*\)\s*\{\s*\}|exception when others then null'
```

Then the database passes from F1, the Supabase advisors, and the role matrix in
`actio-test-protocol`.

**A sweep with no findings is reported as a sweep with no findings, with the output
attached.** Silence is not the same as a clean result, and the difference is the whole
reason this role exists.
