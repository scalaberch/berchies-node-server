import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { createConnection, RowDataPacket } from 'mysql2/promise';
import { resolveDatabaseHost } from '@server/modules/database/drivers/resolveDatabaseHost';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type TableRow = RowDataPacket & { TABLE_NAME: string };
type CreateRow = RowDataPacket & { [key: string]: string };

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
  const host = resolveDatabaseHost('MYSQL_HOST', 'localhost');
  const user = process.env.MYSQL_USER ?? 'mysql';
  const password = process.env.MYSQL_PASS ?? '';
  const database = process.env.MYSQL_DATABASE ?? 'db';
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const rawName = process.argv[2] ?? 'baseline_snapshot';
  const migrationName = sanitizeName(rawName);

  if (!migrationName) {
    console.error('Migration name must contain letters or numbers.');
    process.exit(1);
  }

  const connection = await createConnection({
    host,
    user,
    password,
    database,
    port,
  });

  try {
    const [tableRows] = await connection.query<TableRow[]>(
      `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME ASC
      `,
      [database],
    );

    const excludedTables = new Set(['kysely_migration', 'kysely_migration_lock']);
    const tableNames = tableRows.map((row) => row.TABLE_NAME).filter((name) => !excludedTables.has(name));

    if (tableNames.length === 0) {
      console.log('No application tables found to snapshot.');
      process.exit(0);
    }

    const createStatements: string[] = [];
    for (const tableName of tableNames) {
      const [createRows] = await connection.query<CreateRow[]>(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createRows[0]?.['Create Table'];
      if (!createSql) {
        throw new Error(`Failed to resolve CREATE TABLE statement for '${tableName}'.`);
      }
      createStatements.push(createSql);
    }

    const dropStatements = [...tableNames]
      .reverse()
      .map((tableName) => `DROP TABLE IF EXISTS \`${tableName}\`;`);

    const migrationsDir = path.resolve(process.cwd(), 'src', 'database', 'migrations');
    await fs.mkdir(migrationsDir, { recursive: true });

    const fileName = `${formatTimestamp(new Date())}_${migrationName}.ts`;
    const filePath = path.join(migrationsDir, fileName);

    const createStatementsLiteral = JSON.stringify(createStatements, null, 2);
    const dropStatementsLiteral = JSON.stringify(dropStatements, null, 2);

    const fileContents = `import { Kysely, sql } from 'kysely';

const createStatements: string[] = ${createStatementsLiteral};
const dropStatements: string[] = ${dropStatementsLiteral};

export async function up(db: Kysely<any>): Promise<void> {
  await sql.raw('SET FOREIGN_KEY_CHECKS = 0').execute(db);
  for (const statement of createStatements) {
    await sql.raw(statement).execute(db);
  }
  await sql.raw('SET FOREIGN_KEY_CHECKS = 1').execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql.raw('SET FOREIGN_KEY_CHECKS = 0').execute(db);
  for (const statement of dropStatements) {
    await sql.raw(statement).execute(db);
  }
  await sql.raw('SET FOREIGN_KEY_CHECKS = 1').execute(db);
}
`;

    await fs.writeFile(filePath, fileContents, 'utf8');
    console.log(`Created baseline migration: src/database/migrations/${fileName}`);
    console.log(`Tables included: ${tableNames.length}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('db:migration:baseline failed');
  console.error(error);
  process.exitCode = 1;
});
