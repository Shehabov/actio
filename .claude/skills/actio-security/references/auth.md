# Authentication and authorisation (A1 to A5)

Moved verbatim from the old `actio-security` SKILL.md, section A. Read when the diff touches auth, sessions, a route guard, a policy, an Edge Function that takes an id, or any path into the data.

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
- Check `get_advisors` with type `security`, which names unprotected tables directly.

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
