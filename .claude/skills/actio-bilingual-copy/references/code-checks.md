# Code checks for the copy gate

Read when source under `web/`, `extension/` or `supabase/` exists at the snapshot you are
certifying. At the usual copy stage none does: record these `n/a` with the reason "no code
at the copy stage" (R-18). They are re-run by whoever reads built code (code-analyst,
qc-engineer) or by you on a later pass. Never run them against code that is not there.

Run each with the Grep tool (ripgrep syntax, patterns exactly as written, `|` is
alternation) and write the output to `evidence/ux-writer/code-greps.txt`. A hit is not a
defect until triaged: a catalogue lookup, a class name, a test id or a code comment is fine.
A literal a reader sees is a finding against `frontend-engineer` (or `backend-engineer`
under `supabase/`), and the copy gate fails until it is a catalogue row.

```
# A visible string outside the catalogue (web/src and extension/src, *.tsx)
JSX text        >\s*[A-Za-z][^<>{}]{3,}<
attributes      (placeholder|title|aria-label|alt|label)=["'][^"']*[A-Za-z]{3,}
notices         (toast|alert|setError|setMessage|notify)\w*\(\s*["'`]

# A sentence returned instead of a code (supabase/functions, supabase/migrations)
message         "message"\s*:\s*"
raise           raise exception '[A-Za-z ]{12,}

# A count assembled at runtime (web/src and extension/src)
concatenation   \+\s*t\(|\bt\([^)]*\)\s*\+|\$\{[^}]*(count|total|n)\b[^}]*\}\s*\$\{t\(
ternary, suffix \b(count|total|n)\b\s*[=!]==?\s*1\s*\?|plural_?suffix|pluralSuffix

# A date formatted outside BRAND.md §8 (web/src and extension/src)
dates           toLocaleDateString|toLocaleString|toISOString\(\)\.(slice|substring)
```

One check is by reading, not by pattern: every key with a non-empty `ltr_runs` must render
inside `dir="ltr"` or `unicode-bidi: isolate`, in the component that renders the key.

The one standing exception: the extension's manifest name stays English-only until it is
localised (ADR-0003 decision 3). Say so in the evidence rather than counting it as a hit.
