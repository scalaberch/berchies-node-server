import { createPool, type Pool } from 'mysql2';
import { Kysely, MysqlDialect } from 'kysely';
import { getEnvVariable } from '@server/env';
import { resolveDatabaseHost } from './resolveDatabaseHost';
import { ConnectTimeout } from '../defines';
import type { DbConnection } from './types';

export function createMysqlConnection(): DbConnection {
  const host = resolveDatabaseHost('MYSQL_HOST', 'localhost');
  const user = getEnvVariable('MYSQL_USER', false, 'mysql') as string;
  const password = getEnvVariable('MYSQL_PASS', false, '') as string;
  const port = getEnvVariable('MYSQL_PORT', true, 3306) as number;
  const database = getEnvVariable('MYSQL_DATABASE', false, 'db') as string;

  const config = {
    host,
    user,
    password,
    database,
    port,
    connectTimeout: ConnectTimeout,
  };

  const pool: Pool = createPool(config);
  const db = new Kysely<any>({ dialect: new MysqlDialect({ pool }) });

  return {
    driver: 'mysql',
    db,
    config,
    destroy: async () => {
      await db.destroy();
    },
  };
}

export function buildMysqlDatabaseUrl(): string {
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  const pass = process.env.MYSQL_PASS != null ? String(process.env.MYSQL_PASS) : '';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const host = resolveDatabaseHost('MYSQL_HOST', 'localhost');

  if (!user || !database) {
    throw new Error('[database] Missing MYSQL_USER or MYSQL_DATABASE for mysql driver.');
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);
  const auth = pass.length > 0 ? `${u}:${p}` : u;
  return `mysql://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}
