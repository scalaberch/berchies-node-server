import { getEnvVariable } from '@server/env';
import { binToUuid } from '@server/lib/strings';

/**
 * When enabled, primary keys and UUID FK columns are treated as UUID strings in the app layer.
 * Default: enabled. Legacy env: MYSQL_UUID_AUTO (deprecated).
 */
export const isDbUuidAuto = (): boolean => {
  const raw = getEnvVariable('DB_UUID_AUTO', false, '') || getEnvVariable('MYSQL_UUID_AUTO', false, '');
  const s = String(raw).trim().toLowerCase();
  if (!s) {
    return true;
  }
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') {
    return false;
  }
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

/** @deprecated Use isDbUuidAuto */
export const isMysqlUuidAuto = isDbUuidAuto;

/**
 * Normalize a DB value that may be a UUID string or BINARY(16) for API use.
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
