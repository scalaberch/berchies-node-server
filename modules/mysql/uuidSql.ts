import { sql, type Expression, type SqlBool } from 'kysely';

/**
 * For raw {@link import('kysely').SelectQueryBuilder#where} callbacks (e.g. `paginate` transformers)
 * where binary UUID columns must compare to a UUID **string**. Table helpers like `selectWhere` already
 * apply `UUID_TO_BIN` when `MYSQL_UUID_AUTO` is enabled; this matches that behavior for hand-built `where`s.
 *
 * @param qualifiedColumn — Column or qualified name, e.g. `id` or `be.branches_id` (trusted / not user input).
 */
export const sqlBinaryUuidEq = (qualifiedColumn: string, uuidString: string): Expression<SqlBool> =>
  sql`${sql.raw(qualifiedColumn)} = UUID_TO_BIN(${uuidString})` as Expression<SqlBool>;
