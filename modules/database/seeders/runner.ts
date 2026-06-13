import 'dotenv/config';
import 'module-alias/register';

import type { Kysely } from 'kysely';
import { getSeedProfile, listSeedProfiles } from '@src/database/seeders';
import { isProductionApplication } from '@server/env';
import { createDbConnection } from '@server/modules/database/drivers';
import { runSeedProfile } from './engine';

async function main() {
  const profileName = process.argv[2];
  if (!profileName) {
    console.error('Usage: npm run db:seed -- <profile>');
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
  const connection = createDbConnection();
  const db = connection.db as Kysely<any>;

  try {
    const { seedRunId } = await runSeedProfile(db, profile);
    console.log(`[seed] Profile "${profile.name}" completed (seedRunId=${seedRunId}).`);
  } finally {
    await connection.destroy();
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
