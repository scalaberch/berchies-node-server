import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { getEnvVariable } from '@server/env';
import { resolveDatabaseHost } from './resolveDatabaseHost';
import type { DbConnection } from './types';

export function createPostgresConnection(): DbConnection {
  const host = resolveDatabaseHost('POSTGRES_HOST', 'localhost');
  const user = getEnvVariable('POSTGRES_USER', false, 'postgres') as string;
  const password = getEnvVariable('POSTGRES_PASSWORD', false, '') as string;
  const port = getEnvVariable('POSTGRES_PORT', true, 5432) as number;
  const database = getEnvVariable('POSTGRES_DB', false, 'postgres') as string;

  const config = {
    host,
    user,
    password,
    database,
    port,
  };

  const pool = new Pool(config);
  const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

  return {
    driver: 'postgres',
    db,
    config,
    destroy: async () => {
      await db.destroy();
    },
  };
}

export function buildPostgresDatabaseUrl(): string {
  const user = process.env.POSTGRES_USER;
  const database = process.env.POSTGRES_DB;
  const pass = process.env.POSTGRES_PASSWORD != null ? String(process.env.POSTGRES_PASSWORD) : '';
  const port = Number(process.env.POSTGRES_PORT) || 5432;
  const host = resolveDatabaseHost('POSTGRES_HOST', 'localhost');

  if (!user || !database) {
    throw new Error('[database] Missing POSTGRES_USER or POSTGRES_DB for postgres driver.');
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);
  const auth = pass.length > 0 ? `${u}:${p}` : u;
  return `postgres://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}
