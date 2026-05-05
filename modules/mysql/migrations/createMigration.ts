import fs from 'fs/promises';
import path from 'path';

function formatTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function sanitizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main() {
  const rawName = process.argv[2];
  if (!rawName) {
    console.error('Usage: npm run db:migration:create -- <migration_name>');
    process.exit(1);
  }

  const migrationName = sanitizeName(rawName);
  if (!migrationName) {
    console.error('Migration name must contain letters or numbers.');
    process.exit(1);
  }

  const migrationsDir = path.resolve(process.cwd(), 'src', 'database', 'migrations');
  await fs.mkdir(migrationsDir, { recursive: true });

  const fileName = `${formatTimestamp(new Date())}_${migrationName}.ts`;
  const filePath = path.join(migrationsDir, fileName);

  const template = `import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // TODO: Implement migration up steps.
}

export async function down(db: Kysely<any>): Promise<void> {
  // TODO: Implement migration down steps.
}
`;

  await fs.writeFile(filePath, template, 'utf8');
  console.log(`Created migration: src/database/migrations/${fileName}`);
}

main().catch((error) => {
  console.error('db:migration:create failed');
  console.error(error);
  process.exitCode = 1;
});
