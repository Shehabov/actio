# Secrets, keys and injection (B1, B2, C1 to C4)

Moved verbatim from the old `actio-security` SKILL.md, sections B and C. Read when the diff adds config, env or keys, or lets user input reach SQL, a shell, the DOM, `eval` or a dynamic import. The history command in B1 is run through the History note in SKILL.md, from the last clean point.

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
