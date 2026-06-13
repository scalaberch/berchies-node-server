import type { Kysely } from 'kysely';

export type DbDriver = 'mysql' | 'postgres';

export interface DbConnection {
  driver: DbDriver;
  db: Kysely<any>;
  config: Record<string, unknown>;
  destroy: () => Promise<void>;
}
