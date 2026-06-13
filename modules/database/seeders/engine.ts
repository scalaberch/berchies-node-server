import type { Kysely } from 'kysely';
import type { SeedContext, SeedProfile, SeedTableName } from '@src/database/seeders/types';

function createSeedContext(seedRunId: string): SeedContext {
  const store: Partial<Record<SeedTableName, string[]>> = {};

  return {
    seedRunId,
    register(table, id) {
      if (!store[table]) {
        store[table] = [];
      }
      store[table]!.push(String(id));
    },
    ids(table) {
      return store[table] ?? [];
    },
    pick(table, index) {
      const list = store[table] ?? [];
      if (list.length === 0) {
        throw new Error(`[seed] No rows registered for table "${table}". Check definition order.`);
      }
      return list[index % list.length];
    },
    pickRoundRobin(table, rowIndex) {
      return this.pick(table, rowIndex);
    },
  };
}

export async function runSeedProfile(db: Kysely<any>, profile: SeedProfile): Promise<{ seedRunId: string }> {
  const seedRunId = profile.name;
  const ctx = createSeedContext(seedRunId);
  void ctx;
  void db;
  console.log(`[seed] Profile "${profile.name}" has no tables configured yet.`);
  return { seedRunId };
}
