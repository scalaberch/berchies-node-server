/**
 * the actual mysql field type of the primary key that must be readable.
 * by default it must be number (int/bigint/float) otherwise it must be string representation
 *
 */
export interface DbInsertResult {
  insertId: DbIdType;
  insertParameters: object | any;
  isCreated: boolean;
}

/** @deprecated Use DbInsertResult */
export interface MysqlInsertResult extends DbInsertResult {}

/** @deprecated Use DbIdType */
export type MysqlIdType = DbIdType;
export type DbIdType = string | number;

/**
 * defines what exactly the primary key is, this is just basically some string match thing.
 * 
 */
export type PrimaryKeyType = 'number' | 'string' | 'uuid';

/**
 * some type definition for table's fields/keys list
 * 
 */
export type TableFieldsArray = string[]; 

/**
 * helper
 * 
 */
export type TableName = string;

/**
 * outputs how many items to show maximum per call.
 * 
 */
export const DEFAULT_SELECT_LIMIT = 100; 
