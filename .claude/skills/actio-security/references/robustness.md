# Robustness and maintainability (G1 to G4)

Moved from the old `actio-security` SKILL.md, section G, with one change under the review slicing: the design walk of failure paths (offline mid-survey, timeouts, partial failure, a shared handset) is `peer-reviewer`'s, so file G1 only where an error path fails open (grants access, returns a success shape) or leaks (internals, data). G4 lost its cross-reference to the other reviewers and now says what you prove. Read when the diff touches error handling, logging or where an invariant is enforced.

## G. Robustness and maintainability

The user-visible half, and the reason a product feels fragile rather than merely insecure.

### G1. Missing error handling · High

AI-assisted code writes the happy path well and the rest not at all. Every one of these is
a real failure that will occur on a frontline handset:

| Path | Must |
|---|---|
| Network timeout | Retry with backoff, or fail with a stated next step |
| Offline mid-survey | Hold on the device, state it plainly, send on reconnect, never double-send |
| Empty form field | Validate on blur, message inline beside the field |
| Wrong data type | Refuse at the boundary with a code, never coerce silently |
| Upstream 5xx | Degrade to something usable, never a blank screen |
| Partial failure | Render what resolved, label what did not |

A swallowed exception is worse than a crash, because it produces a wrong state nobody sees.

### G2. Logging · Medium

Both directions are defects.

- **Absent:** a failure path with nothing logged, no metric and no way to know at 2am.
- **Excessive or unfiltered:** free text, names, phone numbers, tokens or whole request
  bodies written to a log. Filter at the point of writing.

Every log line carries a correlation id so a support conversation can find the run.

### G3. Version control · Medium

Everything in git, nothing generated committed by hand, no large binary without a reason,
no secret in history, and a lockfile committed so a build is reproducible.

### G4. Fragile architecture · Medium

A rule enforced in one place a future change can route around, two enforcement points that can disagree, a boundary that exists only by convention. In this product that is specifically any invariant enforced outside the database. You prove it with a direct PostgREST call that bypasses the layer. Whether the layering is right is `peer-reviewer`'s judgement: file the bypass, not the design.
