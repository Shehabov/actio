# Auth for a workforce with no corporate email

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before touching the survey token flow, the session claims or sign-out behaviour.

## Auth, for a workforce with no corporate email

Supabase Auth's email and password flow does not fit this product. The reader is a frontline
worker on WhatsApp or SMS, often on a shared handset, often with no company email address.

**The flow:**

1. `send-invite` mints a signed, single-use, short-lived token and delivers the link over
   the WhatsApp utility template or SMS.
2. The reader opens it. `survey-token` validates the signature and the single-use record,
   then issues a Supabase session whose JWT carries only what RLS needs.
3. RLS reads the claims. The token never carries anything that identifies the reader to
   their manager.

```jsonc
// custom claims on the survey JWT. Deliberately minimal.
{
  "sub": "<employee uuid>",
  "site_id": "<uuid>",
  "cycle_id": "<uuid>",
  "cohort_id": "<uuid>",
  "role": "respondent"        // respondent | team_lead | operations | leadership | protected_handler
}
```

| Rule | Why |
|---|---|
| The session is scoped to one cycle and expires with it | A link forwarded to a colleague, or left on a shared handset, opens nothing after the cycle closes |
| Single use, recorded server side | A replayed link is refused, and the refusal is logged |
| No refresh token on the respondent session | There is nothing to steal from a shared device |
| Sign out clears local storage completely | The next worker on that handset sees nothing |
| The `service_role` key never leaves a server context | It bypasses every policy. In a browser bundle it is a full data breach. |

Managers and operations use normal Supabase Auth with a real account, because they have one.

---
