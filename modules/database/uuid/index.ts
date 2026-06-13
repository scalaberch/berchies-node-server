import { sql, type RawBuilder } from 'kysely';
import { resolveDbDriver } from '../drivers/resolveDriver';

/** SQL fragment for binding a UUID string in WHERE/INSERT contexts. */
export function sqlWireUuid(value: string): RawBuilder<unknown> {
  const driver = resolveDbDriver();
  if (driver === 'postgres') {
    return sql`${value}::uuid`;
  }
  return sql`UUID_TO_BIN(${value})`;
}

/** SQL for default UUID PK on insert (MySQL binary vs Postgres cast). */
export function sqlDefaultUuidInsert(uuid: string): RawBuilder<unknown> {
  const driver = resolveDbDriver();
  if (driver === 'postgres') {
    return sql`${uuid}::uuid`;
  }
  return sql.raw(`UUID_TO_BIN('${uuid}')`);
}

export function usesBinaryUuidStorage(): boolean {
  return resolveDbDriver() === 'mysql';
}
