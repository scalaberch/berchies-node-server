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

/** Log insert progress within a large step (simulation profile, etc.). */
const ROW_PROGRESS_INTERVAL = 500;

function logStepProgress(stepLabel: string, table: SeedTableName, inserted: number, total: number): void {
  console.log(`[seed] ${stepLabel} ${table} — ${inserted}/${total} rows inserted…`);
}

export async function runSeedProfile(db: Kysely<DB>, profile: SeedProfile): Promise<{ seedRunId: string }> {
  faker.seed(profile.fakerSeed);
  const seedRunId = crypto.randomBytes(4).toString('hex');
  const ctx = createSeedContext(seedRunId);
  const totalSteps = profile.tables.length;

  console.log(
    `[seed] Profile "${profile.name}" starting (fakerSeed=${profile.fakerSeed}, seedRunId=${seedRunId}).`,
  );
  console.log(`[seed] Plan (${totalSteps} step${totalSteps === 1 ? '' : 's'}):`);
  for (let i = 0; i < profile.tables.length; i++) {
    const def = profile.tables[i];
    console.log(`[seed]   ${i + 1}. ${def.table} (${def.count} row${def.count === 1 ? '' : 's'})`);
  }

  for (let stepIndex = 0; stepIndex < profile.tables.length; stepIndex++) {
    const def = profile.tables[stepIndex];
    const stepNum = stepIndex + 1;
    const stepLabel = `[${stepNum}/${totalSteps}]`;

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

    const rowLabel = def.count === 1 ? 'row' : 'rows';
    console.log(`[seed] ${stepLabel} ${def.table} — inserting ${def.count} ${rowLabel}…`);
    const stepStarted = Date.now();
    const showRowProgress = def.count > ROW_PROGRESS_INTERVAL;

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

      if (showRowProgress && (i + 1) % ROW_PROGRESS_INTERVAL === 0) {
        logStepProgress(stepLabel, def.table, i + 1, def.count);
      }
    }

    const elapsedSec = ((Date.now() - stepStarted) / 1000).toFixed(1);
    console.log(`[seed] ${stepLabel} ${def.table} — done (${def.count} ${rowLabel}, ${elapsedSec}s)`);
  }

  return { seedRunId };
}
