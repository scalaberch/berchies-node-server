import { sql, type Expression, type SqlBool } from 'kysely';
import { resolveDbDriver } from './drivers/resolveDriver';

/**
 * Compare a UUID column to a UUID string in raw where callbacks.
 */
export const sqlUuidEq = (qualifiedColumn: string, uuidString: string): Expression<SqlBool> => {
  const driver = resolveDbDriver();
  if (driver === 'postgres') {
    return sql`${sql.raw(qualifiedColumn)} = ${uuidString}::uuid` as Expression<SqlBool>;
  }
  return sql`${sql.raw(qualifiedColumn)} = UUID_TO_BIN(${uuidString})` as Expression<SqlBool>;
};

/** @deprecated Use sqlUuidEq */
export const sqlBinaryUuidEq = sqlUuidEq;
