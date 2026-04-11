import { getEnvVariable } from '@server/env';
import { binToUuid } from '@server/lib/strings';

/**
 * Normalize a DB value that may be a UUID string or BINARY(16) (e.g. raw Kysely rows) for API use.
 */
export const toUuidString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Buffer && value.length === 16) {
    return binToUuid(value);
  }
  return String(value);
};

/**
 * Controls **SELECT** decoding: BINARY(16) → UUID string for non-PK columns.
 * Inserts/updates/WHERE still accept UUID strings for all `id` / `*_id` fields on uuid-PK tables
 * (see `MysqlTable` `getUuidWireFields()`).
 *
 * **`npm run mysql:generateModels`** reads the same flag: when off, `*Table.ts` interfaces keep
 * `Buffer` from `mysql.defines`; when on, generated interfaces use `string` for those columns.
 *
 * **Default: enabled** when unset. Set `MYSQL_UUID_AUTO=0` or `false` for legacy behavior:
 * only the primary key is returned as a string; other binary UUID columns stay `Buffer` in row objects.
 */
export const isMysqlUuidAuto = (): boolean => {
  const raw = getEnvVariable('MYSQL_UUID_AUTO', false, '');
  const s = String(raw).trim().toLowerCase();
  if (!s) {
    return true;
  }
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') {
    return false;
  }
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};
