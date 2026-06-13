import { createMysqlConnection, buildMysqlDatabaseUrl } from './mysql';
import { createPostgresConnection, buildPostgresDatabaseUrl } from './postgres';
import { resolveDbDriver, validateDriverEnv } from './resolveDriver';
import { isRunningInDocker, resolveDatabaseHost } from './resolveDatabaseHost';
import type { DbConnection, DbDriver } from './types';

export { resolveDbDriver, validateDriverEnv };
export { isRunningInDocker, resolveDatabaseHost };
export type { DbConnection, DbDriver };

export function createDbConnection(): DbConnection {
  const driver = resolveDbDriver();
  validateDriverEnv(driver);

  if (driver === 'postgres') {
    return createPostgresConnection();
  }

  return createMysqlConnection();
}

export function buildDatabaseUrl(driver: DbDriver = resolveDbDriver()): string {
  validateDriverEnv(driver);
  return driver === 'postgres' ? buildPostgresDatabaseUrl() : buildMysqlDatabaseUrl();
}

export function getCodegenDialect(driver: DbDriver = resolveDbDriver()): 'mysql' | 'postgres' {
  return driver;
}
