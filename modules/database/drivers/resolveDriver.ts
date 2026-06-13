import type { DbDriver } from './types';

const VALID_DRIVERS: DbDriver[] = ['mysql', 'postgres'];

export function resolveDbDriver(): DbDriver {
  const raw = String(process.env.DB_DRIVER ?? '').trim().toLowerCase();
  if (!raw) {
    throw new Error(
      '[database] DB_DRIVER is required. Set DB_DRIVER=mysql or DB_DRIVER=postgres in .env',
    );
  }
  if (!VALID_DRIVERS.includes(raw as DbDriver)) {
    throw new Error(
      `[database] Invalid DB_DRIVER="${raw}". Must be one of: ${VALID_DRIVERS.join(', ')}`,
    );
  }
  return raw as DbDriver;
}

export function validateDriverEnv(driver: DbDriver): void {
  if (driver === 'mysql') {
    const missing = ['MYSQL_USER', 'MYSQL_DATABASE'].filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `[database] DB_DRIVER=mysql requires: ${missing.join(', ')}. Check your .env file.`,
      );
    }
    return;
  }

  const missing = ['POSTGRES_USER', 'POSTGRES_DB'].filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[database] DB_DRIVER=postgres requires: ${missing.join(', ')}. Check your .env file.`,
    );
  }
}
