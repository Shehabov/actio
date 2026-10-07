# Dependencies and supply chain (E1 to E3)

Moved verbatim from the old `actio-security` SKILL.md, section E. Read when `package.json` or the lockfile changes, or a webhook or jsonb body is parsed.

## E. Dependencies and supply chain

### E1. Hallucinated packages · High

The slopsquatting risk. AI-assisted code routinely imports libraries that do not exist, and
an attacker who registers that plausible name owns the build.

**Every new dependency in a diff is verified to exist and to be the one intended**, by
checking the registry, the repository link, the download count and the publish date. A
package published last week with forty downloads and a name one character from a popular
one is the attack, not a coincidence.

```bash
git diff origin/main... -- package.json | grep '^+' | grep -oE '"[^"]+":\s*"[^"]+"'
```

### E2. Outdated libraries with known CVEs · High

```bash
npm audit --audit-level=moderate
npm audit fix --dry-run  # read what a fix would change and what it cannot; the author applies it
```

Actio has no Python code, so there is no `pip audit`.

**Every critical and high finding is fixed or explicitly accepted in writing with a reason
and a date.** "It is only a dev dependency" is an acceptance, and it gets written down like
any other.

### E3. Insecure deserialization · High

Untrusted JSON written straight into a typed column, a webhook body parsed with no schema
validation, or any structured input trusted because it arrived in the right shape. Validate
against a schema at every boundary, including between your own services.
