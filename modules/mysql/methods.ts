import Log from '@server/logs';
import mysql from 'mysql2/promise';
import { camelCaseToSnakeCase, isCamelCase } from '@server/lib/strings';
import { Kysely, sql, WhereParameters } from './defines';
import {
  createSelectQueryBuilder,
  SelectQueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,
  RawBuilder,
} from 'kysely';

export type QuerySort = 'asc' | 'desc';

export type SortCondition = {
  [key: string]: QuerySort;
};

export type UniversalBuilder =
  | SelectQueryBuilder<any, any, any>
  | UpdateQueryBuilder<any, any, any, any>
  | DeleteQueryBuilder<any, any, any>;

export type WhereCondition = {
  // Operators
  $eq?: Record<string, any>;
  $ne?: Record<string, any>;
  $gt?: Record<string, any>;
  $gte?: Record<string, any>;
  $lt?: Record<string, any>;
  $lte?: Record<string, any>;
  $like?: Record<string, string>;
  $in?: Record<string, any[]>;

  // Direct Key-Value Shorthand
  [key: string]: any;
};

/**
 * This is just the mapping for sql operations
 *
 */
const OperatorMap: Record<string, string> = {
  $eq: '=',
  $ne: '!=',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $like: 'like',
  $in: 'in',
};

/**
 * create a mysql connection
 *
 * @param host
 * @param user
 * @param password
 * @returns
 */
export const createMysqlConnection = async (host = '127.0.0.1', user = 'mysql', password = '') => {
  const connection = await mysql.createConnection({
    host,
    user,
    password,
  });

  return connection;
};

/**
 * create an alias for a table name
 * (i.e. table_name -> tn)
 *
 * @param tableName
 * @returns
 */
export const createTableAlias = (tableName = '') => {
  if (isCamelCase(tableName)) {
    tableName = camelCaseToSnakeCase(tableName);
  }

  const split = tableName.split('_').map((str) => str[0].toLowerCase());
  return split.join('');
};

/**
 * handle sql query if the input parameters are an array. format of query would be
 * SELECT * FROM table WHERE field = ? AND anotherField = ?
 * ['firstvalue', 'secondvalue']
 *
 * @param queryString
 * @param params
 * @returns
 */
export const handleArrayParametersToSql = (queryString: string, params: any[]): RawBuilder<any> => {
  const queryParts = queryString.split('?');
  if (queryParts.length - 1 !== params.length) {
    throw new Error('SQL query build error: Mismatch between placeholders and parameters.');
  }

  // Dynamically build the SQL query using sql.raw() and sql.lit()
  const kyselyQuery = queryParts.reduce(
    (acc, part, index) => {
      return index < params.length
        ? sql`${acc}${sql.raw(part)}${sql.lit(params[index])}`
        : sql`${acc}${sql.raw(part)}`;
    },
    sql``,
  );

  // // Execute the query using db.execute()
  // const result = await kyselyQuery.execute(db);
  // return result.rows;

  return kyselyQuery;
};

/**
 * handle sql query if input parameters is an object. format of query would be
 * SELECT * FROM table WHERE field = :fieldName AND anotherField = :value
 * { fieldName = 'value', value: 'another value' }
 *
 * @param queryString
 * @param params
 * @returns
 */
export const handleNamedParametersToSql = (
  queryString: string,
  params: Record<string, any>, // Named parameters as an object
): RawBuilder<any> => {
  // Find all named parameters (e.g., :name, :age) in the query
  const paramMatches: string[] = queryString.match(/:\w+/g) || [];

  // Reduce to replace `:paramName` with `sql.lit(value)`
  const kyselyQuery = paramMatches.reduce<{ query: any; remainingQuery: string }>(
    (acc, param) => {
      const paramName = param.slice(1); // Remove leading `:`

      if (!(paramName in params)) {
        throw new Error(`Missing parameter: ${paramName}`);
      }

      // Get the value and escape it safely
      const value = sql.lit(params[paramName]);

      // Split query before and after this parameter
      const [beforeParam, afterParam] = acc.remainingQuery.split(param, 2);

      return {
        query: sql`${acc.query}${sql.raw(beforeParam)}${value}`,
        remainingQuery: afterParam ?? '',
      };
    },
    { query: sql``, remainingQuery: queryString }, // Initial accumulator
  );

  // Append any remaining query string after the last parameter
  const finalQuery = sql`${kyselyQuery.query}${sql.raw(kyselyQuery.remainingQuery)}`;

  // // Execute the query using db.execute()
  // const result = await finalQuery.execute(db);
  // return result.rows;

  return finalQuery;
};

/**
 * caveat: if output is TOO LARGE then system will output a 413 error. be careful!
 *
 * @param db
 * @param queryString
 * @param params
 * @returns
 */
export const executeRawQuery = async <T>(
  db: Kysely<T>,
  queryString: string,
  params: any[] | Record<string, any>,
) => {
  const query = Array.isArray(params)
    ? handleArrayParametersToSql(queryString, params)
    : handleNamedParametersToSql(queryString, params);
  const compiled = query.compile(db);
  const caller = new Error().stack?.split('\n')[2].trim();

  try {
    const start = performance.now();
    const results = await query.execute(db);
    const end = performance.now();

    return {
      rows: results.rows,
      sql: compiled.sql,
      params: compiled.parameters,
      rowsAffected: results.numAffectedRows ? Number(results.numAffectedRows) : 0,
      caller,
      durationMs: end - start,
    };
  } catch (err) {
    Log.error(`Error executing raw query: `, err);
    throw err;
  }

  // try {
  //   result = Array.isArray(params)
  //     ? await handleArrayParametersToSql(db, queryString, params)
  //     : await handleNamedParametersToSql(db, queryString, params);
  // } catch (err) {
  //   console.error('Error executing raw query:', err);
  //   throw err;
  // }
};

/**
 * copy schema from a db to another
 *
 * @param connection
 * @param sourceDb
 * @param targetDb
 */
export const copySchema = async (
  connection: mysql.Connection,
  sourceDb: string,
  targetDb: string,
) => {
  try {
    // 1. Disable FK checks to avoid "table doesn't exist" errors during creation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Get all tables from the source
    const [tables]: any = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE"',
      [sourceDb],
    );

    for (const row of tables) {
      const tableName = row.TABLE_NAME;

      // 3. Get the original CREATE statement
      // We use backticks to ensure special characters in names don't break the query
      const [createResult]: any = await connection.query(
        `SHOW CREATE TABLE \`${sourceDb}\`.\`${tableName}\``,
      );
      const createSql = createResult[0]['Create Table'];

      // 4. Clean start for the target table
      await connection.query(`DROP TABLE IF EXISTS \`${targetDb}\`.\`${tableName}\``);

      // 5. Direct the CREATE statement to the target DB
      // We replace the start of the string to point to targetDb
      const redirectedSql = createSql.replace(/CREATE TABLE `/, `CREATE TABLE \`${targetDb}\`.\``);
      await connection.query(redirectedSql);
      // console.log(`Successfully copied structure for: ${tableName}`);
    }

    // 6. Re-enable FK checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('Error copying schema:', error);
    throw error;
  }
};

/**
 * wipe whole data from database. BE CAREFUL ABOUT THIS! DO NOT USE ROOT, duh.
 *
 * @param connection
 * @param dbName
 */
export const wipeDatabase = async (connection: mysql.Connection, dbName: string) => {
  try {
    // 1. Disable Foreign Key checks so we can wipe tables in any order
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Get all table names from the target database
    const [tables]: any = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE"',
      [dbName],
    );

    // 3. Loop through and truncate each one
    for (const row of tables) {
      const tableName = row.TABLE_NAME;
      // Skip the migration table so you don't have to re-run migrations
      if (tableName === 'kysely_migration' || tableName === '_migrations') continue;

      await connection.query(`TRUNCATE TABLE \`${dbName}\`.\`${tableName}\``);
    }

    // 4. Re-enable Foreign Key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`🧹 Database ${dbName} wiped clean.`);
  } catch (error) {
    console.error('❌ Error wiping database:', error);
    throw error;
  }
};

/**
 * apply dynamic filter
 *
 * @param query
 * @param condition
 * @returns
 */
export function applyDynamicFilters(
  query: UniversalBuilder,
  condition: WhereCondition,
): UniversalBuilder {
  let filteredQuery: any = query;

  for (const [key, value] of Object.entries(condition)) {
    // 1. Check if the key is an Operator (e.g., $gte)
    if (key.startsWith('$')) {
      const sqlOperator = OperatorMap[key];
      if (!sqlOperator || !value) continue;

      // Loop through fields inside the operator: { fld: 1 }
      for (const [column, val] of Object.entries(value)) {
        filteredQuery = filteredQuery.where(column, sqlOperator as any, val);
      }
    }

    // 2. Otherwise, treat it as a direct Equality shorthand: { key: value }
    else {
      filteredQuery = filteredQuery.where(key, '=', value);
    }
  }

  return filteredQuery as UniversalBuilder;
}

/**
 *
 * @param query
 * @param sortCondition
 * @returns
 */
export function applyDynamicSorts(
  query: UniversalBuilder,
  sortCondition: SortCondition,
): UniversalBuilder {
  let sortedQuery: any = query;

  for (const [key, sortValue] of Object.entries(sortCondition)) {
    sortedQuery = sortedQuery.orderBy(key, sortValue);
  }

  return sortedQuery as UniversalBuilder;
}

//////////////////////////////////////////

/**
 * make object as where statements
 * @todo: include for conditionals
 *
 * @param qb
 * @param parameters
 * @returns
 */
export const convertParameterObjectToWhereStatements = (
  qb: UniversalBuilder,
  parameters: Record<string, any>,
): UniversalBuilder => {
  if (!parameters || Object.keys(parameters).length === 0) return qb;

  return qb;
};
export const convertParameterObjectToWhereStatements1 = (qb: any, parameters: WhereParameters) => {
  for (const operator in parameters) {
    const value = parameters[operator];

    if (operator === '$or') {
      qb = qb.where((eb) => {
        const collection = [];

        for (const col of collection) {
          console.log(value);
        }
        return eb.or(collection);
      });
    }

    switch (operator) {
      default:
        qb = qb.where(operator, '=', value);
    }
  }

  return qb;
};
