import { withMigrationDb } from './migrationDb';

async function main() {
  await withMigrationDb(async (_db, migrator) => {
    const { results, error } = await migrator.migrateDown();

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`migration reverted: ${it.migrationName}`);
      } else if (it.status === 'Error') {
        console.error(`revert failed: ${it.migrationName}`);
      }
    });

    if (error) {
      throw error;
    }
  });
}

main().catch((error) => {
  console.error('db:migrate:down failed');
  console.error(error);
  process.exitCode = 1;
});
