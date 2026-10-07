# The sweep

Moved from the old `actio-security` SKILL.md ("The sweep"), with the history note added. Read on every pass, as the first step of Execute. Paste the grep block into one Bash call and redirect its output to `evidence/security/sweep-<sha7>.txt`.

## The sweep

Run whole, every time, unless a critical in pass 1 or 2 stops it as described above. Record
each command and its output to `.actio/runs/<run-id>/evidence/security/`. The base is the
one in `run.json`; the commands write it as `origin/main`.

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
git grep -nE 'NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)' | grep -vE 'NEXT_PUBLIC_SUPABASE_(PUBLISHABLE|ANON)_KEY'   # the publishable key is public by design, see B2
git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -v '\.env\.example$'   # must print nothing: web/.env.local is gitignored

# D3. personal data in logs
git grep -nE 'console\.(log|error)\(.*(phone|free_text|full_name|email)'

# G1. swallowed errors
git grep -nE 'catch\s*\([^)]*\)\s*\{\s*\}|exception when others then null'
```

Then the database passes, through the Supabase MCP: the F1 queries and probes through
`execute_sql`, `get_advisors` for type `security` and type `performance`, `list_tables`, the
F2 bucket check, and the role matrix in `actio-test-protocol`, each cell a role-switched
probe inside `begin; ... rollback;`. Save every call and its output to `evidence/security/`.


**History.** `git log -p --all` grows with the repo, so scan from the last clean point: read `clean-through: <sha>` from the newest `evidence/security/history-scan.txt` under `.actio/runs/*/`, then run the line below and write a new `history-scan.txt` ending `clean-through: <HEAD sha>`. With no marker, and on the pre-release pass, scan the whole history (drop `--not`). Deleting a secret is not fixing it: rotate it.

```bash
git log -p --all --not <clean-through-sha> | grep -nEi 'service_role|sk_live|-----BEGIN [A-Z ]*PRIVATE KEY'
```

## Evidence names

Under `evidence/security/`: `sweep-<sha7>.txt`, `history-scan.txt`, `npm-audit.json`, `advisors-security.json`, `advisors-performance.json`, `rls-state.txt`, `probes/` (one file per role-switched probe, request and response or query and rows).

## Resubmission

Read `git diff <your reviewed snapshot> <new snapshot>` and your own open findings only, and always re-run the whole sweep on the new snapshot (it is cheap). Read every delta hunk in a high-risk class (migrations, policies, grants, definer functions, Edge Functions, auth and session code, storage, `package.json`, the lockfile, `next.config`, anything matching `responses`, `free_text` or `phone`) and carry the rest, recording the carry when nothing in your lens moved. Read the whole diff again when the brief or ADR changed, when the delta is over half the original diff, or when it touches a privacy surface you passed. `minor` and `nit` never reject.
