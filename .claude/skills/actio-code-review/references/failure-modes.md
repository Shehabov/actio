# Failure-mode walk

Merged from the table in the old `actio-code-review` and the catalogue in the old `peer-reviewer` agent file, which had drifted apart. The skill's table was the superset; the agent's extra facets (partial write, reopened cycle, provider message id, free text made attributable) are folded in. Physical CSS and concatenated counts are `code-analyst`'s facts and are not walked here.

Read when the change touches survey intake, messaging, webhooks, outbound sends, deadlines, shared devices or issue state. Record clean or a finding for every row. Actio's operating conditions make several of these routine rather than exotic.

| Scenario | Ask |
|---|---|
| A caller skips the Edge Function and calls PostgREST directly | Is the rule in a policy, a trigger or a security-definer function, so it still holds? A rule that only an Edge Function applies is bypassed by a client that has the anon key and the table name. |
| The anon key leaks | It is public by design. What does a holder of it reach? Every answer to that should be a revoke or a policy, not an assumption about the client. |
| Connection drops mid-survey | Are the answers on the device? Are they durable and resumable, and is a partial response never counted as a completion? Do they send on reconnect, and do they double-send? |
| Duplicate webhook | Meta and the SMS gateway redeliver routinely. Is delivery handling idempotent on the provider's message id, not on your own primary key? |
| Retried outbound message | Billing is per message. Does a retry send twice and charge twice, with no idempotency key on the send? Can a worker receive the same prompt twice, and does the second one reopen a closed cycle? |
| Shared handset | Does anything persist per account that should persist per device? Does session state, autofill or a cached token leak one person's response to the next? Is the previous reader's data still on screen? (Token lifetime and storage clearing are `security-analyst`'s checks; this is the design question.) |
| Clock skew, DST, site time zone | Due dates are dates in the site's time zone, not instants. Is a deadline computed in the site's zone or the server's? Does an issue flip to the overdue lane a day early for a site east of the server? Does a shift boundary land correctly? |
| Partial write | If this fails halfway, is the state legal? Can an issue exist without an owner, or evidence attach to an issue that did not transition? If two writes must both land they are in one transaction, or there is a reconciliation path. |
| Cohort changes between two reads | The preview said 23, submission sees 22. What does the reader see? |
| Below threshold | Does it degrade, or does it error and strand the reader? Can any filter, export, sort or count path return an aggregate below the minimum group size, or make a free-text response attributable? **Always a blocker.** |
| Longest locale | Does the layout hold at Tagalog, not just English? |
| Arabic and RTL, design level | A Latin run inside an Arabic sentence without isolation, a numeric-only date, a form that demands a surname. |
| Empty and dense | Zero issues, and forty. Both are normal. |
