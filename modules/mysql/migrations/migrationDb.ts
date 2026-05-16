import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import dotenv from 'dotenv';
import { Kysely, Migrator, MysqlDialect, FileMigrationProvider } from 'kysely';
import { createPool } from 'mysql2';
import { resolveMysqlHost } from '@server/modules/mysql/resolveMysqlHost';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type Database = Record<string, never>;

function resolveMigrationsFolder(): string {
  if (process.env.MIGRATIONS_FOLDER) {
    return path.resolve(process.cwd(), process.env.MIGRATIONS_FOLDER);
  }

  const srcFolder = path.resolve(process.cwd(), 'src', 'database', 'migrations');
  const distFolder = path.resolve(process.cwd(), 'dist', 'src', 'database', 'migrations');

  const hasJsMigrations =
    fs.existsSync(distFolder) &&
    fs.readdirSync(distFolder).some((name) => name.endsWith('.js') && !name.endsWith('.d.js'));

  if (hasJsMigrations) {
    return distFolder;
  }

  return srcFolder;
}

const migrationsFolder = resolveMigrationsFolder();

export function createDb() {
  const host = resolveMysqlHost();
  const user = process.env.MYSQL_USER ?? 'mysql';
  const password = process.env.MYSQL_PASS ?? '';
  const database = process.env.MYSQL_DATABASE ?? 'db';
  const port = Number(process.env.MYSQL_PORT ?? 3306);

  return new Kysely<Database>({
    dialect: new MysqlDialect({
      pool: createPool({
        host,
        user,
        password,
        database,
        port,
      }),
    }),
  });
}

export function createMigrator(db: Kysely<Database>) {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: fsp,
      path,
      migrationFolder: migrationsFolder,
    }),
  });
}

export async function withMigrationDb<T>(work: (db: Kysely<Database>, migrator: Migrator) => Promise<T>) {
  const db = createDb();
  const migrator = createMigrator(db);

  try {
    return await work(db, migrator);
  } finally {
    await db.destroy();
  }
}
