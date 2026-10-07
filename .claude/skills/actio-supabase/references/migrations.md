# Migrations

Moved verbatim from `actio-supabase/SKILL.md` on 2026-10-07. Read it before writing, proving or applying a migration. The migration layout and the no-declarative-schema rule are in `actio-architecture/references/repository-layout.md`.

## Migrations

| Rule | |
|---|---|
| Hand-authored, one concern per file | `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql`. The timestamp comes from the shell, never invented: `node -e "console.log(new Date().toISOString().replace(/\D/g,'').slice(0,14))"`. The slug is snake_case and names the one concern. |
| Forward-only | Never edit a migration once it has been applied. A correction, including one a reviewer asks for, is a new migration. |
| A written reverse for every file | Written with the migration, recorded in `.actio/runs/<run-id>/backend-engineer/reverse.md` (one fenced SQL block per migration, with the lock each statement takes), its executable copy saved as `evidence/backend/reverse-<slug>.sql`, and proved offline with `node .actio/bin/db-test.mjs --reverse <that file>`, which applies it to the migrated, seeded database and then re-applies the newest migration. It proves the newest migration's reverse only, so prove each reverse while its migration is still the newest. If it is ever needed it ships as a new forward migration. |
| Proved before it is applied | Green offline under db-test, and its contents run through `execute_sql` inside `begin; ... rollback;` on the project. Only then `apply_migration`, once. |
| Reviewed for lock behaviour | `supabase-postgres-best-practices` carries the lock rules. The lock each statement takes, and on which table, is recorded in `reverse.md`. A rewrite on a live table is an outage. |
| Indexes built `concurrently` | On a table that already holds rows, and therefore outside a transaction block, in a migration of its own. `apply_migration` is reported to run each file inside a transaction, where `concurrently` fails, and the offline runner will not catch that, so until a concurrent build has been seen to apply on this project, one is a decision for Shehab before the apply: a plain `create index` with its write lock recorded in `reverse.md`, or a window. Never drop `concurrently` quietly, and never run it through `execute_sql` instead, because SQL outside a migration file is never applied. An index on a new, empty table needs no concurrent build. |
| Three-step for a non-null column | Add nullable, backfill in batches, then set not null |
| Never a rename | Add, dual-write, backfill, stop reading, drop |
| Risky migrations proved at realistic size | Offline under PGlite with row counts the seed scales to, and in a rolled-back transaction on the project. A Supabase branch is optional and ask-first, because it costs money. No gate requires one. |
| Policies migrate with their table | A migration that adds a table and leaves its policy for later ships an open table |
| Applied, then verified | `list_migrations` shows every file by name, `list_tables` shows the tables and their RLS, `get_advisors` is clean for `security` and `performance` or every finding is accepted in writing, and `generate_typescript_types` has rewritten `web/src/lib/database.types.ts` |
