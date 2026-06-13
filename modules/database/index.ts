import { ServerModule } from '@server/modules/defines';
import { Kysely, sql } from './defines';
import Log from '@server/logs';
import { executeRawQuery } from './methods';
import { createDbConnection, type DbConnection, type DbDriver } from './drivers';

export class Database extends ServerModule {
  private connection: DbConnection | null = null;
  private serverConfig: Record<string, unknown> = {};

  override async onInit() {
    this.connection = createDbConnection();
    this.serverConfig = this.connection.config;
  }

  override async onStart() {
    try {
      await this.execute('SELECT 1', []);
      const driver = this.getDriver();
      Log.info(`[database:${driver}] Connection success.`);
      return true;
    } catch (error) {
      Log.error(`[database] Database failed to connect on initialization: `, error);
      return false;
    }
  }

  override async onStop(): Promise<void> {
    if (this.connection === null) {
      return Promise.resolve();
    }

    await this.connection.destroy();
    this.connection = null;
    return Promise.resolve();
  }

  getDriver(): DbDriver {
    return this.connection?.driver ?? 'postgres';
  }

  getDb(): Kysely<any> | null {
    return this.connection?.db ?? null;
  }

  getConfig() {
    return this.serverConfig;
  }

  isInitialized() {
    return this.connection !== null;
  }

  sql(rawSql = '') {
    return sql<any>`${sql.raw(rawSql)}`;
  }

  async execute(query: string, repl?: any[] | Record<string, any>) {
    return await executeRawQuery(this.getDb(), query, repl);
  }

  async query(query: string, repl?: any[] | Record<string, any>) {
    const queryResults = await this.execute(query, repl);
    return queryResults.rows ?? [];
  }

  async tableExists(tableName: string) {
    const db = this.getDb();
    if (db === null) {
      return false;
    }

    const tables = (await this.getTables(true)) as string[];
    return tables.includes(tableName.trim());
  }

  async getTables(namesOnly = true) {
    const db = this.getDb();
    if (db === null) {
      return [];
    }

    const tables = await db.introspection.getTables();
    if (namesOnly) {
      return tables.map((table) => table.name);
    }

    return tables;
  }

  setSettings(settings = {}) {
    this.serverConfig = settings;
  }
}

/** @deprecated Use Database */
export class Mysql extends Database {}

const databaseModule = new Database();
export default databaseModule;
