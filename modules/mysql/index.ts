import { ServerModule } from '@server/modules/defines';
import server from '@server/index';
import { Kysely, MysqlDialect, PoolConfig, sql } from './defines';
import { Log } from '@server/logs';
import { createPool, Pool } from 'mysql2';
import { executeRawQuery } from './methods';

export const mysql = (): Mysql | null => {
  const mysqlObject = server.modules.getModule('mysql');
  if (mysqlObject === null) {
    return null;
  }
  return mysqlObject as Mysql;
};

export default class Mysql extends ServerModule {
  private Pool: Pool | null = null;
  private Dialect: MysqlDialect;
  private Db: Kysely<any> | null = null;
  private serverConfig = {};

  override async init() {
    // set the configuration
    this.serverConfig = PoolConfig;

    // setup the pool
    this.Pool = createPool(PoolConfig);

    // setup the kysely object
    this.Dialect = new MysqlDialect({ pool: this.Pool });
    this.Db = new Kysely<any>({ dialect: this.Dialect });
  }

  override async start() {
    // actually attempt connect to database
    try {
      await this.execute(`SELECT 1`, []);
      Log.info(`Connection success.`);
      return true;
    } catch (error) {
      Log.error(`Database failed to connect: `, error);
      return false;
    }
  }

  override async stop(): Promise<void> {
    // actually stop the database connection
    if (this.Db === null) {
      return Promise.resolve();
    }

    await this.Db.destroy();
    return Promise.resolve();
  }

  /**
   * get the database instance (the kysely one)
   * 
   * @returns 
   */
  getDb(): Kysely<any> | null {
    return this.Db;
  }

  /**
   * gets the database configuration
   * 
   * @returns 
   */
  getConfig() {
    return this.serverConfig;
  }

  /**
   * check if database has been initialized
   *
   * @returns
   */
  isInitialized() {
    return this.Db !== null;
  }

  /**
   * generate a proper SQL query object from a string
   *
   * @param rawSql
   * @returns
   */
  sql(rawSql = '') {
    return sql<any>`${sql.raw(rawSql)}`;
  }

  /**
   * execute a sql query and returns the full metadata results
   *
   * @param sql
   * @param repl
   * @returns
   */
  async execute(sql: string, repl?: any[] | Record<string, any>) {
    return await executeRawQuery(this.Db, sql, repl);
  }

  /**
   * executes a sql query and returns the results
   * 
   * @param sql 
   * @param repl 
   */
  async query(sql: string, repl?: any[] | Record<string, any>) {
    const queryResults = await this.execute(sql, repl);
    return queryResults.rows ?? [];
  }

  /**
   * check if a table exists in the database
   *
   * @param tableName
   * @returns
   */
  async tableExists(tableName: string) {
    const db = this.getDb();
    if (db === null) {
      return false;
    }

    const tables = (await this.getTables(true)) as string[];
    return tables.includes(tableName.trim());
  }

  /**˝
   * get all tables in the database
   *
   * @param namesOnly
   * @returns
   */
  async getTables(namesOnly = true) {
    const db = this.getDb();
    if (db === null) {
      return [];
    }

    const tables = await this.getDb().introspection.getTables();
    if (namesOnly) {
      const tableNames = tables.map((table) => table.name);
      return tableNames;
    }

    return tables;
  }
}
