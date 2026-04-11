import 'dotenv/config';
import 'module-alias/register';

import { createPool } from 'mysql2';
import { Kysely, MysqlDialect, sql } from 'kysely';
import type { DB } from '@src/database/mysql.defines';
import { getEnvVariable, isDbClearAllowedEnvironment, isProductionApplication } from '@server/env';
import { PoolConfig } from '@server/modules/mysql/defines';

/**
 * All application tables from `DB` (Kysely). Order does not matter while FK checks are off.
 * Keep in sync with `src/database/mysql.defines.ts` when tables are added/removed.
 */
const TABLES_TO_CLEAR: Array<keyof DB> = [
  'users',
  'branch_employees',
  'customer_categories',
  'customer_charge_invoices',
  'customer_ledger_entries',
  'customers',
  'employees',
  'categories',
  'branches',
];

async function truncateAllApplicationTables(db: Kysely<DB>): Promise<void> {
  await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);
  try {
    for (const name of TABLES_TO_CLEAR) {
      await sql`TRUNCATE TABLE ${sql.table(name)}`.execute(db);
    }
  } finally {
    await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);
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

  const rawPort = Number(getEnvVariable('MYSQL_PORT', true, 3306));
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 3306;

  const pool = createPool({
    ...PoolConfig,
    port,
  });
  const db = new Kysely<DB>({ dialect: new MysqlDialect({ pool }) });

  try {
    await truncateAllApplicationTables(db);
    console.log(`[db:clear] Truncated ${TABLES_TO_CLEAR.length} tables.`);
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('[db:clear] Failed:', err);
  process.exit(1);
});
