# MySQL seed runner (CLI)

This folder contains the **executable entrypoints** that connect to MySQL, invoke the seed **engine**, and (separately) truncate application tables. It does **not** define seed data—that lives in `src/database/seeders/`.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run seed -- <profile>` | Run a registered seed profile (e.g. `minimal`). |
| `npm run db:clear` | Truncate all listed application tables (destructive; dev/local only). |

Examples:

```bash
npm run seed -- minimal
```

Profiles are registered in `src/database/seeders/profiles/registry.ts`. Listing available names without reading code: run `npm run seed` with no argument—the runner prints usage and available profiles.

## Files

- **`runner.ts`** — Loads `dotenv` and `module-alias`, reads `MYSQL_PORT` (default 3306), builds a `mysql2` pool and Kysely `DB` instance, resolves the profile via `getSeedProfile(profileName)` from `src/database/seeders`, calls `runSeedProfile(db, profile)`, then **`await db.destroy()`** (which ends the pool; do not call `pool.end()` again).
- **`engine.ts`** — `runSeedProfile(db, profile)`: seeds faker, creates `seedRunId` and `SeedContext`, iterates definitions in order, validates `dependsOn`, inserts rows, registers ids. Returns `{ seedRunId }`.
- **`clearAllRunner.ts`** — Truncates tables in `TABLES_TO_CLEAR` with `FOREIGN_KEY_CHECKS` disabled. Intended for resetting the DB before a fresh seed; **not** the same as `npm run seed`.

## Safety

- **`runner.ts` (seed)** — Exits with an error if `isProductionApplication()` is true (both `ENV` and `NODE_ENV` treated as production). Seeders are refused in that mode.
- **`clearAllRunner.ts`** — Refuses production application mode **and** requires `isDbClearAllowedEnvironment()` (typically `ENV=local` or `ENV=dev`). See `@server/env` for exact rules.

## Environment

- Uses the same MySQL pool settings as the app (`PoolConfig` from `server/modules/mysql/defines`) plus `MYSQL_PORT`.
- Requires a working DB and schema matching `src/database/mysql.defines.ts` (Kysely `DB`).

## Engine behavior (summary)

For full detail and how to author definitions, see **`src/database/seeders/README.md`**.

In short: each profile is an ordered list of table definitions. The engine inserts `count` rows per definition, registers each row’s `id` on the context, and validates dependencies before children run.

## Keeping `db:clear` in sync

`clearAllRunner.ts` maintains a static list `TABLES_TO_CLEAR` keyed by `DB`. When you add or remove tables in the schema, update that list (and the comment pointing to `mysql.defines.ts`) so truncate order stays correct relative to foreign keys (order is irrelevant while FK checks are off, but the list must include every table you want emptied).

## See also

- `src/database/seeders/README.md` — Profiles, `SeedTableDefinition`, `SeedContext`, and adding new seed data.
