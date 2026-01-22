import { getEnvVariable } from '@server/env';
import { Kysely, MysqlDialect, sql } from 'kysely';



export const isMysqlEnabled = true;
export const isListenerEnabled = true;
export const defineRelativePath = '../../../src/models/mysql.defines.ts';
export const MAX_SERVER_ID = 4294967295;
export const ConnectTimeout = 30000;
export const AcquireTimeout = 30000;


/**
 * This is the configuration for the actual mysql server.
 *
 */
export interface MysqlServerConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  database: string;
  dialect?: string;
  dialectModule?: string;
}

/**
 * This is the configuration for the mysql service in this project
 *
 */
export interface MysqlConfig {
  enableListener?: boolean;
}

/**
 * Define the basic server configuration
 *
 */
const host = getEnvVariable('MYSQL_HOST', false, 'localhost') as string;
const user = getEnvVariable('MYSQL_USER', false, 'mysql') as string;
const password = getEnvVariable('MYSQL_PASS', false, '') as string;
const port = getEnvVariable('MYSQL_PORT', true, 3306) as number;
const database = getEnvVariable('MYSQL_DATABASE', false, 'db') as string;

/**
 * get mysql pool configuration
 *
 */
export const PoolConfig = {
  host,
  user,
  password,
  database,
  connectTimeout: ConnectTimeout,
};

export { Kysely, MysqlDialect, sql };

export interface CreateUpdateFlag {
  append?: boolean;
  increment?: boolean;
}


/**
 * table key array list
 */
export type MysqlTableKeysArray = MysqlFieldType[];
export type MysqlFieldType = number | string | symbol | null;



/**
 * Below are definitions for custom mysql table
 *
 */

export type MysqlFieldValue = string | number | boolean | symbol | null | Date | undefined;

export interface ComparisonOperators {
  $eq?: MysqlFieldValue;
  $ne?: MysqlFieldValue;
  $gt?: number | Date | string; // Allows comparing numbers, dates, or strings lexicographically
  $gte?: number | Date | string;
  $lt?: number | Date | string;
  $lte?: number | Date | string;
  $in?: (MysqlFieldValue | Date)[]; // Field value must be in the array
  $nin?: (MysqlFieldValue | Date)[]; // Field value must not be in the array
}

export type FieldCondition = MysqlFieldValue | Date | ComparisonOperators;

export type WhereParameters = {
  $or?: WhereParameters[];
  $and?: WhereParameters[];
  $nor?: WhereParameters[];
  $not?: WhereParameters;
  [key: string]: FieldCondition | WhereParameters | WhereParameters[];
};


/**
 * Pagination dataset
 * 
 */
export interface PaginationResult {
  /**
   * The array of items found in paged results.
   * 
   */
  items: any[];
  /**
   * Current page number
   * 
   */
  page: number,
  /**
   * Total pages of the parent dataset/table.
   * 
   */
  totalPages: number,
  /**
   * Total documents/entries of the table.
   * 
   */
  totalDocs: number;
  /**
   * Limit on how many items will i fit on `items` per page.
   * 
   */
  limit: number,
  /**
   * The previous page. If null this means there's no previous page.
   * 
   */
  prevPage: number | null,
  /**
   * The next page. If null this means there's no next page.
   * 
   */
  nextPage: number | null,
  /**
   * True if has previous page; False if not.
   * 
   */
  hasPrevPage: boolean,
  /**
   * True if has next page; False if not.
   * 
   */
  hasNextPage: boolean,
}
export interface PaginationSettings {
  select?: [];
  includeSoftDeletes?: boolean
}

/**
 * This is just the mapping for sql operations
 *
 */
export const OperatorMap: Record<string, string> = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $like: 'like',
  $in: 'in',
};