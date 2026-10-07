# Data storage and handling (D1 to D6)

Moved verbatim from the old `actio-security` SKILL.md, section D. Read when the diff touches client storage, logging, URLs, headers, cookies, forms, or anything that sends a message or validates a token.

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
