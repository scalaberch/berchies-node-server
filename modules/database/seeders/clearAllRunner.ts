import 'dotenv/config';
import 'module-alias/register';

import { sql, type Kysely } from 'kysely';
import { getEnvVariable, isDbClearAllowedEnvironment, isProductionApplication } from '@server/env';
import { createDbConnection, resolveDbDriver } from '@server/modules/database/drivers';

/** Application tables to truncate. Update when AMC schema exists. */
const TABLES_TO_CLEAR: string[] = [];

async function truncateAllApplicationTables(db: Kysely<any>, driver: string): Promise<void> {
  if (TABLES_TO_CLEAR.length === 0) {
    console.log('[db:clear] No tables configured (TABLES_TO_CLEAR is empty).');
    return;
  }

  if (driver === 'mysql') {
    await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);
    try {
      for (const name of TABLES_TO_CLEAR) {
        await sql`TRUNCATE TABLE ${sql.table(name)}`.execute(db);
      }
    } finally {
      await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);
    }
    return;
  }

  for (const name of TABLES_TO_CLEAR) {
    await sql`TRUNCATE TABLE ${sql.table(name)} RESTART IDENTITY CASCADE`.execute(db);
  }
}

async function main() {
  if (isProductionApplication()) {
    console.error('[db:clear] Refusing: production application mode (ENV + NODE_ENV).');
    process.exit(1);
  }

  if (!isDbClearAllowedEnvironment()) {
    const env = String(getEnvVariable('ENV', false, '(unset)')).toLowerCase();
    console.error(
      `[db:clear] Refusing: only ENV=local or ENV=dev is allowed (current ENV="${env}").`,
    );
    process.exit(1);
  }

  const connection = createDbConnection();
  const db = connection.db;

  try {
    await truncateAllApplicationTables(db, resolveDbDriver());
    console.log(`[db:clear] Truncated ${TABLES_TO_CLEAR.length} tables.`);
  } finally {
    await connection.destroy();
  }
}

main().catch((err) => {
  console.error('[db:clear] Failed:', err);
  process.exit(1);
});
