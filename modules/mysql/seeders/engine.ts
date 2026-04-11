import crypto from 'crypto';
import { faker } from '@faker-js/faker';
import type { Kysely } from 'kysely';
import type { DB } from '@src/database/mysql.defines';
import type { SeedContext, SeedProfile, SeedTableName } from '@src/database/seeders/types';

function createSeedContext(seedRunId: string): SeedContext {
  const store: Partial<Record<SeedTableName, Buffer[]>> = {};

  return {
    seedRunId,
    register(table, id) {
      if (!store[table]) {
        store[table] = [];
      }
      store[table]!.push(id);
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

export async function runSeedProfile(db: Kysely<DB>, profile: SeedProfile): Promise<{ seedRunId: string }> {
  faker.seed(profile.fakerSeed);
  const seedRunId = crypto.randomBytes(4).toString('hex');
  const ctx = createSeedContext(seedRunId);

  for (const def of profile.tables) {
    for (const dep of def.dependsOn ?? []) {
      if (ctx.ids(dep).length === 0) {
        throw new Error(
          `[seed] Table "${def.table}" depends on "${dep}", but no rows were seeded for it.`,
        );
      }
    }

    if (def.table === 'customer_categories') {
      const nCust = ctx.ids('customers').length;
      const nCat = ctx.ids('categories').length;
      const maxPairs = nCust * nCat;
      if (def.count > maxPairs) {
        throw new Error(
          `[seed] customer_categories count ${def.count} exceeds unique (customer×category) pairs (${maxPairs}).`,
        );
      }
    }

    for (let i = 0; i < def.count; i++) {
      const row = await Promise.resolve(
        def.buildRow({
          ctx,
          faker,
          rowIndex: i,
          randomness: profile.randomness,
        }),
      );

      const id = (row as { id: Buffer }).id;
      await db.insertInto(def.table).values(row as DB[keyof DB]).execute();
      ctx.register(def.table, id);
    }
  }

  return { seedRunId };
}
