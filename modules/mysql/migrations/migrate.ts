import { withMigrationDb } from './migrationDb';

async function main() {
  await withMigrationDb(async (_db, migrator) => {
    const { results, error } = await migrator.migrateToLatest();

    results?.forEach((it) => {
      if (it.status === 'Success') {
        console.log(`migration success: ${it.migrationName}`);
      } else if (it.status === 'Error') {
        console.error(`migration failed: ${it.migrationName}`);
      }
    });

    if (error) {
      throw error;
    }

    console.log('Database is up to date.');
  });
}

main().catch((error) => {
  console.error('db:migrate failed');
  console.error(error);
  process.exitCode = 1;
});
