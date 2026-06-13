import { Kysely, sql } from 'kysely';

export const defineRelativePath = '../../../src/database/schema.defines.ts';
export const MAX_SERVER_ID = 4294967295;
export const ConnectTimeout = 30000;
export const AcquireTimeout = 30000;

export interface DatabaseServerConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  database: string;
  driver: string;
}

export interface DatabaseConfig {
  enableListener?: boolean;
}

export { Kysely, sql };

export interface CreateUpdateFlag {
  append?: boolean;
  increment?: boolean;
}

export type DbTableKeysArray = DbFieldType[];
export type DbFieldType = number | string | symbol | null;

export type DbFieldValue = string | number | boolean | symbol | null | Date | undefined;

export interface ComparisonOperators {
  $eq?: DbFieldValue;
  $ne?: DbFieldValue;
  $gt?: number | Date | string;
  $gte?: number | Date | string;
  $lt?: number | Date | string;
  $lte?: number | Date | string;
  $in?: (DbFieldValue | Date)[];
  $nin?: (DbFieldValue | Date)[];
}

export type FieldCondition = DbFieldValue | Date | ComparisonOperators;

export type WhereParameters = {
  $or?: WhereParameters[];
  $and?: WhereParameters[];
  $nor?: WhereParameters[];
  $not?: WhereParameters;
  [key: string]: FieldCondition | WhereParameters | WhereParameters[];
};

export interface PaginationResult {
  items: any[];
  page: number;
  totalPages: number;
  totalDocs: number;
  limit: number;
  prevPage: number | null;
  nextPage: number | null;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface PaginationSettings {
  select?: readonly string[];
  includeSoftDeletes?: boolean;
}

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

/** @deprecated Use DbTableKeysArray */
export type MysqlTableKeysArray = DbTableKeysArray;
/** @deprecated Use DbFieldType */
export type MysqlFieldType = DbFieldType;
/** @deprecated Use DbFieldValue */
export type MysqlFieldValue = DbFieldValue;
