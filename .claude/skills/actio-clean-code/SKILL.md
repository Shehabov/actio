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

```python
# Nested: the reader carries three conditions to reach the point
def close(issue, by, at):
    if issue.status != Status.CLOSED:
        if issue.evidence.exists():
            if issue.owner is not None:
                ...

# Guarded: each rule is stated once and the point is at the left margin
def close(issue, by, at):
    if issue.status == Status.CLOSED:
        raise AlreadyClosed()
    if not issue.evidence.exists():
        raise EvidenceRequired()
    if issue.owner is None:
        raise OwnerRequired()
    ...
```

**No flag arguments.** A boolean that forks the whole body is two functions wearing a
coat.

```python
# The call site reads close(issue, True) and tells the reader nothing
def close(issue, force=False): ...

# Two honest names
def close(issue): ...
def force_close(issue, override_reason): ...
```

---

## Files and modules

| Rule | Threshold |
|---|---|
| One responsibility per module | |
| File length | 400 lines. Past that it has more than one job. |
| Class methods | 15 |
| Import direction is one way | No circular imports, ever |
| Layer boundaries hold | Business rules in services, queries in managers, HTTP in views. See `actio-django`. |

Order inside a file, consistently: imports, constants, types, public API, private helpers.
A reader scanning top to bottom should meet the important things first.

---

## Comments

This is where most codebases fail in both directions: too many comments that restate the
code, and none where the reasoning lived only in someone's head.

### The rule

**Code says what. Comments say why.** A comment that says what the code says is noise that
will go stale and then lie.

```python
# Noise. Delete it.
# increment the counter
counter += 1

# Worth its space. Nothing in the code can carry this.
# Cohort size is recomputed here rather than cached, because the privacy preview
# promises the reader a live figure. A stale number would be a claim rather than
# a disclosure, which is the thing this screen exists to avoid.
size = cohort.responses.count()
```

### Always comment these

| Situation | Because |
|---|---|
| A non-obvious decision | The next reader will otherwise "fix" it back |
| A workaround | Name what it works around and the condition for removing it |
| A regulatory, privacy or safety constraint | Cite the invariant: `# I1: enforced here so no caller can bypass it` |
| A performance choice that costs readability | State the measurement that justified it |
| A deliberate departure from this standard | Say why, so it reads as a decision rather than as rot |
| Anything surprising | If it surprised you writing it, it will surprise the next reader |
| A unit, a range, or a boundary that is not in the type | `# seconds, not milliseconds` |

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

```python
"""Reporting queries for survey cohorts.

Every public callable here enforces the reporting threshold (I1) in the queryset,
not in the caller, so there is no code path that returns a cohort below the floor.
The default manager returns none() deliberately: reaching the full set has to be
an explicit choice.

Never add a function here that takes a pre-built queryset from outside this module.
"""
```

Every public function that is not self-evident gets a docstring saying what it returns,
what it raises, and any invariant it upholds. Private helpers usually need only a good
name.

```python
def reportable(self, organisation):
    """Cohorts large enough to report on for this organisation.

    The organisation may raise its threshold, never lower it. Returns an empty
    queryset rather than raising when nothing qualifies, because a caller
    rendering a report needs a page, not an exception.
    """
```

---

## Structure that helps the next model

Specific to this repository, and the reason `code-steward` exists rather than leaving this
to `peer-reviewer`.

| Practice | Why it matters here |
|---|---|
| Module header states the invariants the module upholds | A model handed one file has no repository context. The header supplies it. |
| Domain terms used exactly as the architecture defines them | `issue`, `lane`, `owner`, `evidence`, `cohort`, `closure`. Consistent vocabulary lets a reader match code to the ADR without a translation step. |
| The dangerous path is loud, not documented | A default manager returning `none()` beats a comment saying "remember to filter". Make the wrong thing fail rather than warning against it. |
| Invariants cited by number in the code | `# I5` next to the evidence check ties the line to `actio-architecture` |
| One way to do each thing | Two patterns for one job forces every reader to work out which is current |
| Tests read as specifications | `test_cohort_of_four_never_reports` tells a reader the rule. `test_reporting_1` tells them nothing. |
| No cleverness without a comment earning it | A clever line that saves four lines and costs ten minutes of reading is a bad trade |

---

## Errors

- Fail loudly and early. A swallowed exception is a defect that will surface somewhere
  unrelated.
- Never `except Exception: pass`. Catch what you can handle and let the rest rise.
- Error messages name what happened and what to do. No blame on the reader.
- Custom exception types carry the domain: `EvidenceRequired`, `LaneLacksAuthority`,
  `BelowThreshold`. `ValueError("bad")` tells nobody anything.
- An exception raised by a privacy invariant states the invariant, never the input that
  tripped it. See `BUGS.md` R-01.

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

`code-steward` works this list against the diff at `review-3of3`.

- [ ] Every name says what the thing is, in the domain's language
- [ ] No function over 50 lines, complexity 10, nesting 3, or 4 parameters
- [ ] No flag argument that forks the body
- [ ] No file over 400 lines, no circular import, no layer violation
- [ ] Guard clauses used instead of nesting on the exceptional paths
- [ ] Every module has a header stating its purpose and the invariants it upholds
- [ ] Every non-obvious public function has a docstring giving returns, raises, invariants
- [ ] Every comment says why, not what
- [ ] No commented-out code, no stale comment, no ownerless TODO
- [ ] Invariants cited by number where they are enforced
- [ ] Custom exceptions carry the domain
- [ ] Tests read as specifications
- [ ] No third duplication of the same concept left unextracted
- [ ] No second way to do something the codebase already does once

Findings carry file, line, what, why it costs the next reader, and the concrete change.
Severity uses the same ladder as the other review gates. A readability finding is a
**major** when it will make the next change riskier, and a **minor** when it is only
untidy. `code-steward` blocks on blockers and majors like any other gate owner, and does
not rewrite the author's code.
