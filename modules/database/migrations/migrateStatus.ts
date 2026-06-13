import { withMigrationDb } from './migrationDb';

async function main() {
  await withMigrationDb(async (_db, migrator) => {
    const migrations = await migrator.getMigrations();

    if (migrations.length === 0) {
      console.log('No migration files found.');
      return;
    }

    for (const migration of migrations) {
      const status = migration.executedAt ? 'executed' : 'pending';
      console.log(`${status.padEnd(9)} ${migration.name}`);
    }
  });
}

main().catch((error) => {
  console.error('db:migrate:status failed');
  console.error(error);
  process.exitCode = 1;
});
