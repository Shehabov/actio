# Structural thresholds and named smells

Moved verbatim from the old `actio-code-analysis` section 6. Under the review slicing, `code-analyst` files only cyclomatic complexity over 10, nesting depth over 3 and circular imports (all measured). Every other threshold and smell here is `code-steward`'s reading-cost check (`actio-clean-code`) or `peer-reviewer`'s boundary check: use this file to word the refactor for a breach you do find, never to file one that is theirs. Read when a complexity, nesting or circular-import breach needs a named refactor.

## Thresholds owned by code-steward

| Metric | Threshold | Finding |
|---|---|---|
| Function length | > 50 lines | It is doing more than one thing. Name the things. |
| Parameter count | > 4 | The parameters are an object that has no name yet |
| Duplicated block | > 6 lines, twice | Extract, or explain why the duplication is honest |
| File length | > 400 lines | The module has more than one responsibility |
| Class methods | > 15 | God object forming |

## Named smells and the refactor that resolves each

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
| Layering violation | A rule in an Edge Function that a direct PostgREST call bypasses, or a grant on a base table | See `actio-supabase` |
| Long parameter list of booleans | `render(true, false, true)` | Unreadable at the call site. Options object or separate functions. |
