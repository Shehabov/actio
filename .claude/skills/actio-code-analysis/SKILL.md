---
name: actio-code-analysis
description: Analyse Actio code line by line for defects, security issues, data-layer problems and structural rot. Use when scanning a diff for bugs, checking complexity and duplication, or hunting spaghetti code before the engineering gate.
---

# Code analysis

Read the diff line by line for facts. `peer-reviewer` reads the same diff for judgement,
independently. Both gates must pass, and they are separate because a well-designed change
can carry a real bug and a correct line can implement the wrong thing.

**Not your job:** whether this is the right solution, whether the abstraction is sound,
whether the rollout plan is safe. Those are the peer reviewer's. Also not your job:
anything a formatter or linter already enforces.

Every finding carries file, line, what is wrong, why, the concrete fix, and a severity.

---

## 1. Correctness

| Hunt for | Signature |
|---|---|
| Off by one | `range(len(x))`, `<=` where `<` was meant, slicing at a boundary, pagination arithmetic |
| Null and undefined paths | A value that can be `None` or `undefined` reaching an attribute access or a method call unchecked |
| Unhandled promise rejection | An `async` call with no `await` and no `.catch`, a floating promise in an effect |
| Swallowed exception | `except Exception: pass`, an empty `catch`, a `try` that logs and continues into an invalid state |
| Wrong boolean logic | De Morgan errors, `and`/`or` precedence, a negated condition that reads correctly but is not |
| Wrong comparison | `==` on floats, identity where equality was meant, string comparison of numbers |
| Timezone and DST | `datetime.now()` without a zone, `date` arithmetic across a DST boundary, a deadline in the server's zone rather than the site's |
| Money as float | Currency in a float. Actio quotes `Rp 2.450.000`. Use integers or `Decimal`. |
| Race condition | Read then write without a lock or a transaction, check-then-act, two requests both passing a uniqueness check |
| Mutation of shared state | A default argument that is a list or dict, a module-level mutable, a React state object mutated in place |
| Unawaited async | A coroutine created and dropped |
| Incorrect early return | A guard that returns before a required side effect |

## 2. Security

| Hunt for | Signature |
|---|---|
| Injection | String-built SQL, `raw()` with interpolation, `eval`, an unsanitised value reaching a shell |
| Missing authorisation | A view with authentication but no object-level permission. **Every endpoint, every time.** |
| Mass assignment | A serialiser with `fields = "__all__"`, an update that accepts arbitrary keys |
| Secrets in code or logs | A key, token or password literal. A log line containing a phone number, a name, or a free-text response. |
| Personal data in a URL | An identifier or a phone number in a query string. It lands in access logs and in referrers. |
| Unsafe deserialisation | `pickle`, `yaml.load` without `SafeLoader` |
| SSRF | A user-supplied URL fetched server side |
| Open redirect | A `next` parameter that is not validated against an allowlist |
| Timing leak | An equality check on a secret that is not constant time |
| Missing rate limit | An endpoint that sends a message, or that can be used to enumerate |

## 3. Data layer

| Hunt for | Signature |
|---|---|
| N+1 | An attribute crossing a relation inside a loop, a serialiser method field hitting the database |
| Missing index | A filter or sort on an unindexed column, especially the queue's `(site, status, due)` |
| Unbounded queryset | A list endpoint with no pagination, `.all()` rendered to a template |
| Missing transaction | Two writes that must both happen, outside `atomic()` |
| Non-reversible migration | No `reverse_code`, no stated reason |
| Locking migration | `ALTER TABLE` on a large live table, an index built without `CONCURRENTLY` |
| Model imported in a data migration | Import instead of `apps.get_model` |
| `len()` on a queryset | Evaluates the whole set to count it |
| Count in a loop | Should be one annotation |

## 4. Concurrency and async

- A background task that is not idempotent, where the queue guarantees at-least-once.
- A retry with no backoff cap, or no dead-letter path.
- Shared mutable state across requests.
- A React effect with a missing or over-broad dependency array.
- A React effect deriving state that could be computed during render.
- A cleanup function missing on a subscription or a timer.

## 5. Error handling

- An error message that leaks internals to the client.
- An error body that carries prose instead of a code. Copy belongs to `ux-writer`.
- A caught error that returns a success shape.
- A failure path with no observability: nothing logged, no metric, no way to know at 2am.
- A user-facing failure that blames the reader. `Could not send` is correct; `you entered
  an invalid number` is not.

## 6. Structural rot

Measured, not felt. Report the number.

| Metric | Threshold | Finding |
|---|---|---|
| Function length | > 50 lines | It is doing more than one thing. Name the things. |
| Cyclomatic complexity | > 10 | Extract the branches, or invert the guards |
| Nesting depth | > 3 | Guard clauses and early returns |
| Parameter count | > 4 | The parameters are an object that has no name yet |
| Duplicated block | > 6 lines, twice | Extract, or explain why the duplication is honest |
| File length | > 400 lines | The module has more than one responsibility |
| Class methods | > 15 | God object forming |

Named smells and the refactor that resolves each:

| Smell | Looks like | Resolve with |
|---|---|---|
| God object | One class knowing every other | Split by responsibility, push behaviour to the data |
| Flag argument | `def close(issue, force=False)` where the body forks entirely | Two functions with honest names |
| Shotgun surgery | One change touching seven files | The concept is smeared. Give it a home. |
| Feature envy | A method using another object's data more than its own | Move the method |
| Primitive obsession | A lane, a status or a threshold passed as a bare string or int | Enum or value object |
| Circular import | `a` imports `b` imports `a` | The shared thing belongs in a third module |
| Dead code | Unreachable, unreferenced, or behind a flag removed months ago | Delete it. Git remembers. |
| Commented-out code | A block in comments | Delete it. Git remembers. |
| Magic value | `if size < 5` with no name | `REPORTING_FLOOR`, defined once |
| Layering violation | A business rule in a serialiser, a query in a view | See `actio-django` |
| Long parameter list of booleans | `render(true, false, true)` | Unreadable at the call site. Options object or separate functions. |

---

## 7. Actio-specific defects

These are the ones a general-purpose scan will never find. Check every one on any diff
that touches UI, reporting, or the issue lifecycle.

| Defect | Why it matters |
|---|---|
| A hardcoded hex, spacing value, radius or duration | Tokens come from `BRAND.md`. A literal is drift. |
| A spacing value of 14, 18, 20 or 30 | Those do not exist in this product |
| A number rendered outside Plex Mono, or a numeric column without tabular figures | Every number is instrumentation |
| A percentage rendered without its sample size | Contradicts the product's own argument |
| A status rendered by colour with no written label | Fails for deuteranopia, and it is a brand rule |
| White text on a Vega fill | 2.27:1. Measured. Fails. |
| A reporting path that can return a cohort below the threshold | I1 |
| A filter validated client side only | I2. Server side or it does not exist. |
| Raw free text crossing the API boundary | I3 |
| A protected case reachable from an engagement query | I4 |
| A close path with no evidence check | I5. The product's entire claim. |
| An assignment with no lane-authority check | I6 |
| A deadline rendered in the reader's time zone | I8 |
| A string concatenated with a count | Breaks Indonesian and Tagalog plurals |
| A physical CSS property where a logical one belongs | Breaks RTL |
| A font loaded from a public CDN | A blocked request is an unreadable survey |
| An outbound message send with no idempotency key | Per-message billing. A retry costs money. |
| `Cohort.objects.all()` or any unfiltered access to reportable data | The default manager returns `none()` for a reason |

---

## Finding format

```markdown
### F-03 · issues/services/close.py:61 · Blocker · correctness

`close()` writes the `Closure` record after `transition()` saves the status, both outside
a transaction. If the insert raises, the issue reads `closed` with no audit record.

**Why it is wrong.** I7 requires every closure to record who, when, and whether it was
late. A closed issue with no `Closure` row is a state the invariant says cannot exist, and
it is silent: nothing fails, the queue just shows an issue that closed with no trace.

**Fix.** Wrap both calls in `transaction.atomic()`. Add a test that forces the `Closure`
insert to fail and asserts `issue.status` is unchanged.
```

| Severity | Means |
|---|---|
| **Blocker** | Data loss, a security hole, a broken invariant, or a defect that will fire in normal use |
| **Major** | A real defect on a path that is reachable but not routine, or a complexity breach over threshold |
| **Minor** | A latent problem or a smell below threshold. Worth fixing, does not hold the gate. |

Rank by severity. Never pad the list with style opinions a formatter owns: every one of
those makes the blocker at the top less likely to be read.

---

## Method

1. Read the task brief, so you know what the code was supposed to do.
2. `git diff` the change. Read every changed line, not the summary.
3. Work sections 1 to 7 in order. Sections 1 to 3 catch the defects that ship; 6 and 7
   catch the ones that accumulate.
4. For each finding, prove it. Trace the path, or write the failing case. A finding you
   could not reproduce is reported as suspected, and labelled as such.
5. Run the tooling and read its output rather than trusting the exit code: type checker,
   linter, complexity report, `assertNumQueries` on hot paths.
6. Write findings to `.actio/runs/<run-id>/code-analyst/findings.md`, ordered by severity.
7. Set gate `review` (2 of 2). Any blocker or major means fail.

Handoff goes to `engineering-lead` on pass, or back to the author with `status: rejected`
and the round number on fail.
