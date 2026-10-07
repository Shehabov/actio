# supabase/

The database source of record for Actio: Postgres, Row Level Security, functions and Edge Functions, on one Supabase project.

Nothing here exists yet except this file. `backend-engineer` creates the folders below as the first back-end run lands.

```
supabase/
├── migrations/<yyyymmddhhmmss>_<slug>.sql   schema, RLS, grants and functions, in order
├── tests/*.test.sql                         pgTAP: the privacy invariants and the state machine
├── functions/<name>/index.ts                Edge Functions
└── seed.sql                                 test data for the offline proof
```

## The rules

- Migrations are hand-authored, forward-only and one concern per file, each with a written reverse in the run's rollback notes. There is no `supabase/schemas/` workflow: it needs the Supabase CLI and Docker, which the swarm does not use.
- Nothing reaches the project from SQL that is not in a migration file. Migrations are applied and proved through the Supabase MCP (`.mcp.json` scopes it to one project), and checked with `list_migrations` and `get_advisors`.
- The offline proof is `npm run db:test` from the repository root: the migrations, the seed and the tests run on PGlite, with no Docker. It exits 2 until there is a migration to prove, and it never replaces pgTAP on the project.

The privacy invariants (a reporting threshold of 5, reworded free text, protected cases outside the queue) and evidence on close are enforced here, as RLS policies, revoked base tables and security-definer functions, never in the client.

How to write and prove all of it: [`.claude/skills/actio-supabase/SKILL.md`](../.claude/skills/actio-supabase/SKILL.md). The commands are in [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md#the-database).
