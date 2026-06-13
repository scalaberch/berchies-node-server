import { resolveDatabaseHost } from '@server/modules/database/drivers/resolveDatabaseHost';

/** @deprecated Use resolveDatabaseHost('MYSQL_HOST') from database module */
export function resolveMysqlHost(): string {
  return resolveDatabaseHost('MYSQL_HOST', 'localhost');
}

export { resolveDatabaseHost };
