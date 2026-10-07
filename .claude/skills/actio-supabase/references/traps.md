# RLS traps

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before writing or reviewing any policy, grant or view. The core skill lists the trap names; this table holds the reason and the fix for each.

## RLS traps

These are the ones that actually bite, and `code-analyst` checks every one.

| Trap | Why it hurts | Fix |
|---|---|---|
| `auth.uid()` called per row in a policy | It re-evaluates for every row, so a queue scan becomes thousands of calls | Wrap it: `(select auth.uid())`. Postgres then treats it as a constant for the scan. |
| A policy with a subquery on an unindexed column | Full scan per row | Index the column the policy filters on, always |
| `security definer` without `set search_path = ''` | A caller can shadow an object and run code as the definer | Pin it on every definer function, with every reference schema-qualified |
| A view without `security_invoker = on` | Runs as its creator, silently bypassing the caller's policies | Set it on every view over a protected table |
| A client grant on a `security_invoker` view whose base table is revoked | The caller needs a grant on every column the view reads, so the select fails with `42501` for every caller. The grant is inert, and it tempts someone to turn `security_invoker` off to "fix" it | Give no client grant; route clients through the security-definer function. To hide columns only, use column-level grants on the base table and a view over exactly those columns |
| RLS enabled but no policy | Denies everything, which looks like a bug and gets "fixed" by disabling RLS | Write the policy in the same migration that enables RLS |
| `service_role` in a client bundle | Bypasses every policy. A full breach. | It lives in Edge Function secrets and nowhere else. |
| A new table with no `enable row level security` | Open by default once granted | Every table, in the same file that creates it. No exceptions. |
| Policies written only for `select` | `insert`, `update` and `delete` default to denied, until someone grants broadly to fix it | Write all four explicitly, even where one is `false` |
| `using` without `with check` on an update policy | A row can be updated into a state the caller could not have selected | Always both |

`get_advisors` for type `security` catches several of these on the real project. It does not
replace the table: a clean advisor run with a bare `auth.uid()` in a policy is still a finding.
