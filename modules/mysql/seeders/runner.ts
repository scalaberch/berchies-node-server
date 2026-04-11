import 'dotenv/config';
import 'module-alias/register';

import { createPool } from 'mysql2';
import { Kysely, MysqlDialect } from 'kysely';
import type { DB } from '@src/database/mysql.defines';
import { getSeedProfile, listSeedProfiles } from '@src/database/seeders';
import { getEnvVariable, isProductionApplication } from '@server/env';
import { PoolConfig } from '@server/modules/mysql/defines';
import { runSeedProfile } from './engine';

async function main() {
  const profileName = process.argv[2];
  if (!profileName) {
    console.error('Usage: npm run seed -- <profile>');
    console.error(`Available profiles: ${listSeedProfiles().join(', ')}`);
    process.exit(1);
  }

  if (isProductionApplication()) {
    console.error(
      '[seed] Refusing to run: ENV and NODE_ENV are both "production". Seeders are disabled in this mode.',
    );
    process.exit(1);
  }

  const profile = getSeedProfile(profileName);
  const rawPort = Number(getEnvVariable('MYSQL_PORT', true, 3306));
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 3306;

  const pool = createPool({
    ...PoolConfig,
    port,
  });
  const db = new Kysely<DB>({ dialect: new MysqlDialect({ pool }) });

  try {
    const { seedRunId } = await runSeedProfile(db, profile);
    console.log(`[seed] Profile "${profile.name}" completed (seedRunId=${seedRunId}).`);
  } finally {
    // Kysely.destroy() ends the mysql2 pool; do not call pool.end() again (double-close
    // can yield "Can't add new command when connection is in closed state").
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
