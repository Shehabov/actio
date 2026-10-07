---
name: actio-clean-code
description: Enforce clean code and commenting standards on Actio so the codebase stays readable and maintainable for the humans and the models that come next. Use when writing, reviewing or refactoring any code, and when deciding whether a file, a function, a name or a comment is good enough to ship.
---

# Clean code

Code is read far more often than it is written, and in this repository it is read by two
audiences with different failure modes: a person who needs to change it under pressure,
and a model that will be handed a slice of it with no surrounding context. Both are served
by the same thing, which is code that explains itself and comments that explain what code
cannot.

This standard is enforced by `code-steward` at the `review-3of3` gate. It is not advice.

Not this lens: whether the change is right or layered correctly (`peer-reviewer`); whether it is correct, complexity and nesting numbers and circular imports included (`code-analyst`); security, secrets included (`security-analyst`); anything a formatter or linter owns.

---

## The test

**Could someone who has never seen this file change it correctly, having read only the
file and the names in it?**

If the answer needs a conversation, the code is not finished.

---

## Naming

| Rule | Bad | Good |
|---|---|---|
| Use the domain's language, not CRUD nouns | `item`, `record`, `data`, `obj` | `issue`, `cohort`, `evidence`, `closure` |
| A name says what it is, not how it is stored | `issueArray`, `str_name` | `issues`, `name` |
| Booleans read as a claim | `checkClosed`, `flag` | `isClosed`, `hasEvidence`, `canReassign` |
| Functions are verbs, and say what they return | `handleIssue`, `process` | `assignOwner`, `reportableCohorts` |
| No abbreviation that is not domain standard | `usrCnt`, `respRt` | `userCount`, `responseRate`. `n`, `id`, `url` are fine. |
| Constants name the meaning, not the number | `FIVE`, `LIMIT` | `REPORTING_FLOOR` |
| Symmetry: opposites use opposite words | `open` / `finish` | `open` / `close`, `assign` / `unassign` |
| No type in the name in a typed language | `issueString` | `issue` |

**A name that needs a comment to explain it is a naming defect, not a comment defect.**
Rename first, then see whether the comment is still needed. Usually it is not.

Actio's nouns, used exactly as `actio-architecture` defines them. Generic CRUD naming is a **major**, not a nitpick, because it is how the model drifts away from the product.

| Use | Not |
|---|---|
| issue | item, ticket, record, entry |
| owner | assignee, user, responsible_party |
| lane (open, in progress, overdue, closed, protected) | status, state, stage, phase |
| evidence | attachment, proof, file, upload |
| cycle | period, round, wave, sprint |
| response, respondent | submission, answer, entry, participant |
| route, routing | assign, dispatch, escalate (escalate means something else here) |

---

## Functions

| Rule | Threshold |
|---|---|
| One job. If you cannot name it without "and", split it. | |
| Length | 50 lines is the ceiling. Most should be far shorter. |
| Cyclomatic complexity | 10 |
| Nesting depth | 3 |
| Parameters | 4. Beyond that, the parameters are an object that has no name yet. |
| Return type is one thing | Never a value on success and a boolean on failure |

Two patterns that do most of the work:

**Guard clauses over nesting.** Handle the exceptional cases first and return, so the
happy path is flat and reads last.

**No flag arguments.** A boolean that forks the whole body is two functions wearing a
coat.

Examples of both: `references/examples.md`. Complexity and nesting numbers are `code-analyst`'s; you file function length, parameters, flag arguments, and guard-clause style below the nesting threshold.

---

## Files and modules

| Rule | Threshold |
|---|---|
| One responsibility per module | |
| File length | 400 lines. Past that it has more than one job. |
| Class methods | 15 |
| Import direction is one way | No circular imports, ever |
| Layer boundaries hold | Rules in policies, triggers and security-definer functions. The client never reaches a base table. An Edge Function never does what a policy should do. See `actio-supabase`. |

Order inside a file, consistently: imports, constants, types, public API, private helpers.
A reader scanning top to bottom should meet the important things first.

Circular imports are `code-analyst`'s (measured) and layer violations `peer-reviewer`'s: do not file them.

---

## Comments

This is where most codebases fail in both directions: too many comments that restate the
code, and none where the reasoning lived only in someone's head.

### The rule

**Code says what. Comments say why.** A comment that says what the code says is noise that
will go stale and then lie.

### Always comment these

| Situation | Because |
|---|---|
| A non-obvious decision | The next reader will otherwise "fix" it back |
| A workaround | Name what it works around and the condition for removing it |
| A regulatory, privacy or safety constraint | Cite the invariant: `-- I1: enforced here so no caller can bypass it` |
| A performance choice that costs readability | State the measurement that justified it |
| A deliberate departure from this standard | Say why, so it reads as a decision rather than as rot |
| Anything surprising | If it surprised you writing it, it will surprise the next reader |
| A unit, a range, or a boundary that is not in the type | `// seconds, not milliseconds` |

### Never comment these

- What the next line does.
- Commented-out code. Delete it. Git remembers.
- A changelog, an author, or a date. Git remembers those too.
- A `TODO` with no owner and no condition. Either file it in `BUGS.md` or do it.
- A comment that contradicts the code. It is worse than no comment, and it will happen
  whenever the code changes and the comment does not.

### Docstrings and module headers

Every module opens with a short header saying what it is for and what it must not do.
This is the single highest-value comment in the repository for a model that will be handed
this file alone.

Every function that is not self-evident gets a comment saying what it returns, what it
raises, and which invariant it upholds, by number. Private helpers usually need only a good
name.

A policy is code and gets the same treatment. Every policy carries a comment naming the
invariant it upholds and why it is written the way it is, because a policy that reads as
arbitrary is the one a future change relaxes.

Examples of a module header, a docstring and a policy comment, in SQL: `references/examples.md`.

---

## Errors

- Fail loudly and early. A swallowed exception is a defect that will surface somewhere
  unrelated.
- Never `exception when others then null` in plpgsql, and never an empty `catch {}` in
  TypeScript. Catch what you can handle and let the rest rise.
- Error messages name what happened and what to do. No blame on the reader.
- Custom exception types carry the domain: `EvidenceRequired`, `LaneLacksAuthority`,
  `BelowThreshold`. `ValueError("bad")` tells nobody anything.
- An exception raised by a privacy invariant states the invariant, never the input that
  tripped it.

Swallowed exceptions and unhandled rejections are `code-analyst`'s defects; you file how an error is worded and which domain it carries.

---

## Duplication

Duplication is cheaper than the wrong abstraction. Both are worse than the right one.

| Occurrences | Do |
|---|---|
| Twice | Leave it. Two things that look alike may not be the same thing. |
| Three times, same reason | Extract. Name the concept, not the code shape. |
| Three times, different reasons | Leave it. They will diverge, and a shared helper will grow flags. |

When you extract, the name must describe the concept. If the best name you can find is
`handleStuff` or `processData`, you have found a code-shape coincidence rather than a
concept.

---

## The review

`code-steward` works this list at `review-3of3`. Each line is a `checks[]` entry: `pass` with its evidence (command output or `file:line`), or `fail` with the finding ids.

- [ ] Every name says what the thing is, in the domain's language
- [ ] No function over 50 lines or 4 parameters (complexity and nesting numbers are `code-analyst`'s)
- [ ] No flag argument that forks the body
- [ ] No file over 400 lines or class over 15 methods
- [ ] Guard clauses used instead of nesting on the exceptional paths
- [ ] Every module has a header stating its purpose and the invariants it upholds
- [ ] Every non-obvious public function has a docstring giving returns, raises, invariants
- [ ] Every policy carries a comment naming the invariant it upholds and why it is written that way
- [ ] Every comment says why, not what
- [ ] No commented-out code, no stale or contradicting comment, no ownerless TODO
- [ ] Invariants cited by number where they are enforced
- [ ] Custom exceptions carry the domain, and an invariant error states the invariant, never the input
- [ ] Tests read as specifications
- [ ] No third duplication of the same concept left unextracted
- [ ] No second way to do something the codebase already does once

## Findings and severity

One format: a `findings[]` entry in your handoff (`actio-agent-protocol`). `id` `CS-n`; `where` file:line; `rule` the checklist line; `what` what it costs the **next reader**, at most 240 characters ("this is hard to read" is not a finding; "this function does three things and the third is only visible on line 61, so a reader changing the first will not know it exists" is); `fix` the concrete change. Do not rewrite the author's code.

| Severity | Means | Effect |
|---|---|---|
| `blocker` | A comment, name or header on an invariant-enforcing path that states the opposite of what the code does | Gate fails |
| `major` | Makes the next change riskier: no header or invariant comment on a module or policy enforcing I1 to I8, a comment that contradicts the code, a domain noun that hides a wrong model, a function whose third job is invisible, a file past 400 lines that this diff grows | Gate fails |
| `minor` | Only untidy: a name that needs a comment, a vague test name, a missing docstring on low-risk code | Never rejects |
| `nit` | A preference you cannot defend as a cost to the next reader | Never rejects |

Do not inflate: a steward who blocks on tidiness gets overruled, and the real findings go with it.

## References

| File | Holds | Read when |
|---|---|---|
| `references/examples.md` | Guard clauses against nesting, flag arguments, a comment that is noise against one that earns its space, a module header, a docstring and a policy comment; and why the standard is shaped this way in this repository (structure that helps the next model) | You write your first header, docstring or policy finding of a run and need the bar, or an author disputes a finding and you need the reason |
