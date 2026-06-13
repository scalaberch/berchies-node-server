require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const { isDbUuidAutoEnv, resolveDbDriver, resolveDatabaseHost } = require('./driver-config');

function isBufferColumnType(resolved) {
  const s = String(resolved).trim();
  return s === 'Buffer' || /^Buffer\s*\|/.test(s);
}

function isUuidColumnType(resolved) {
  const s = String(resolved).trim();
  return s === 'string' && false;
}

function isPostgresUuidColumnType(resolved, fieldName, pkType) {
  if (pkType === 'uuid' && fieldName.endsWith('_id')) {
    return true;
  }
  const s = String(resolved).trim();
  return s === 'string' && /uuid/i.test(s);
}

function buildFieldTypeMap(fieldDefines) {
  const generatedRe = /^Generated(?:Column)?<([^,]+(?:,[^,]+)*)>$/;
  return Object.fromEntries(
    Object.entries(fieldDefines).map(([field, rawType]) => {
      const trimmed = String(rawType).trim();
      const m = trimmed.match(generatedRe);
      return [field, m ? m[1] : trimmed];
    }),
  );
}

function resolvePrimaryKeyTableType(fieldTypeMap, primaryKey, driver) {
  const t = fieldTypeMap[primaryKey];
  if (isBufferColumnType(t)) {
    return 'uuid';
  }
  if (driver === 'postgres' && String(t).trim() === 'string') {
    return 'uuid';
  }
  return t || 'number';
}

function getUuidFieldNames(fieldTypeMap, fieldNames, driver) {
  if (driver === 'mysql') {
    return fieldNames.filter((f) => isBufferColumnType(fieldTypeMap[f]));
  }
  return fieldNames.filter((f) => {
    const t = String(fieldTypeMap[f] ?? '').trim();
    return t === 'string' && (f.endsWith('_id') || f === 'id');
  });
}

function appLayerUuidTypeForField(resolvedType) {
  const s = String(resolvedType);
  return /\|\s*null\b/.test(s) ? 'string | null' : 'string';
}

function buildInterfaceDeclaration(modelName, fieldTypeMap, uuidFieldNames) {
  const useStringUuids = isDbUuidAutoEnv() && uuidFieldNames.length > 0;
  if (!useStringUuids) {
    return `export interface ${modelName}Interface extends Partial<BaseInterface> {}`;
  }
  const omitKeys = uuidFieldNames.map((k) => `'${k}'`).join(' | ');
  const members = uuidFieldNames
    .map((k) => `  ${k}?: ${appLayerUuidTypeForField(fieldTypeMap[k])};`)
    .join('\n');
  return `/** When DB_UUID_AUTO is on: UUID columns as strings. */
export type ${modelName}Interface = Omit<Partial<BaseInterface>, ${omitKeys}> & {
${members}
};`;
}

function formatFieldsArray(fieldNames) {
  if (fieldNames.length === 0) {
    return '[]';
  }
  return `[\n${fieldNames.map((f) => `\t\t'${f}'`).join(',\n')}\n\t]`;
}

function buildDbTableSource(p) {
  const { modelName, tableName, primaryKey, fieldNames, pkType, fieldTypeMap, driver } = p;
  const fieldsLiteral = formatFieldsArray(fieldNames);
  const uuidFieldNames = getUuidFieldNames(fieldTypeMap, fieldNames, driver);
  const interfaceBlock = buildInterfaceDeclaration(modelName, fieldTypeMap, uuidFieldNames);

  return `/**
 * Auto-generated model for table ${tableName}
 * Do not edit — run: npm run db:generateModels
 */

import { ${modelName} as BaseInterface } from '../schema.defines';
import DbTable, {
  PrimaryKeyType,
  DbInsertResult,
  TableName,
  WhereCondition,
  SortCondition,
} from '@server/modules/database/table';

export const tableName = '${tableName}';
export const tablePrimaryKey = '${primaryKey}';

${interfaceBlock}
export type ${modelName}Field = keyof ${modelName}Interface;

export type ${modelName}WhereCondition = WhereCondition & {
  [K in ${modelName}Field]?: any;
};

export class ${modelName}DbTable extends DbTable {
  protected primaryKeyType: PrimaryKeyType = '${pkType}';
  protected fields: ${modelName}Field[] = ${fieldsLiteral};
  protected uuidFields: ${modelName}Field[] = [];
  protected foreignKeys: Record<string, TableName> = {};

  insert(params: ${modelName}Interface): Promise<DbInsertResult> {
    return super.insert(params);
  }

  create(params: ${modelName}Interface): Promise<${modelName}Interface | null> {
    return super.create(params);
  }

  selectWhere(
    condition: ${modelName}WhereCondition = {},
    selectFields = [],
    sortCondition: SortCondition = {},
    limit = 100,
  ) {
    return super.selectWhere(condition, selectFields, sortCondition, limit) as Promise<
      ${modelName}Interface[]
    >;
  }

  selectById(id: any, selectFields: ${modelName}Field[] = []) {
    return super.selectById(id, selectFields) as Promise<${modelName}Interface | null>;
  }
}

const ${modelName}Table = new ${modelName}DbTable(tableName, tablePrimaryKey);
export default ${modelName}Table;
`;
}

async function generateClassContent(classObject, outputDir, driver) {
  const { modelName, tableName, primaryKey, fieldDefines } = classObject;
  const fieldNames = Object.keys(fieldDefines);
  const fieldTypeMap = buildFieldTypeMap(fieldDefines);
  const pkType = resolvePrimaryKeyTableType(fieldTypeMap, primaryKey, driver);

  const source = buildDbTableSource({
    modelName,
    tableName,
    primaryKey,
    fieldNames,
    pkType,
    fieldTypeMap,
    driver,
  });

  const fileName = `${modelName.toLowerCase()}Table.ts`;
  fs.writeFileSync(path.join(outputDir, fileName), source, 'utf8');
}

function getTableMap(definesFilePath) {
  const definesContent = fs.readFileSync(definesFilePath, 'utf8');
  const tableRegex = /export interface (\w+) {([\s\S]*?)}/g;

  const modelMap = {};
  let tableClassMap = {};
  let match;

  while ((match = tableRegex.exec(definesContent)) !== null) {
    const [, ifaceName, tableFields] = match;
    const isMainDb = ifaceName === 'DB';

    const fieldRegex = /(\w+):\s*(.+?);/g;
    let fieldMatch;

    const fieldTypeMap = {};
    while ((fieldMatch = fieldRegex.exec(tableFields)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].trim();

      if (isMainDb) {
        fieldTypeMap[fieldType] = fieldName;
      } else {
        fieldTypeMap[fieldName] = fieldType;
      }
    }

    if (isMainDb) {
      tableClassMap = fieldTypeMap;
    } else {
      modelMap[ifaceName] = fieldTypeMap;
    }
  }

  return { modelMap, tableClassMap };
}

async function getMysqlPrimaryKey(connection, tableName) {
  const safe = tableName.trim().replace(/`/g, '');
  try {
    const [rows] = await connection.execute(
      `SHOW KEYS FROM \`${safe}\` WHERE Key_name = 'PRIMARY'`,
    );
    if (rows.length > 0) {
      return rows[0].Column_name;
    }
  } catch (dbError) {
    console.error(`Error getting primary key for ${tableName}:`, dbError);
  }
  return '';
}

async function getPostgresPrimaryKey(pool, tableName) {
  try {
    const result = await pool.query(
      `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1::regclass AND i.indisprimary`,
      [tableName],
    );
    if (result.rows.length > 0) {
      return result.rows[0].column_name;
    }
  } catch (dbError) {
    console.error(`Error getting primary key for ${tableName}:`, dbError);
  }
  return '';
}

async function generateTableClasses(definesFilePath, outputDir) {
  const driver = resolveDbDriver();
  let tableFieldMap = {};
  try {
    tableFieldMap = getTableMap(definesFilePath);
  } catch (error) {
    console.error('Error generating table classes:', error);
    return false;
  }

  const { tableClassMap, modelMap } = tableFieldMap;

  if (driver === 'postgres') {
    const pool = new Pool({
      host: resolveDatabaseHost('POSTGRES_HOST', 'localhost'),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      port: Number(process.env.POSTGRES_PORT) || 5432,
    });

    for (const modelName of Object.keys(tableClassMap)) {
      const sqlTableName = tableClassMap[modelName];
      const fieldDefines = modelMap[modelName];
      const primaryKey = await getPostgresPrimaryKey(pool, sqlTableName);
      await generateClassContent(
        { modelName, tableName: sqlTableName, primaryKey, fieldDefines },
        outputDir,
        driver,
      );
    }

    await pool.end();
    return true;
  }

  const connection = await mysql.createConnection({
    host: resolveDatabaseHost('MYSQL_HOST', 'localhost'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  for (const modelName of Object.keys(tableClassMap)) {
    const sqlTableName = tableClassMap[modelName];
    const fieldDefines = modelMap[modelName];
    const primaryKey = await getMysqlPrimaryKey(connection, sqlTableName);
    await generateClassContent(
      { modelName, tableName: sqlTableName, primaryKey, fieldDefines },
      outputDir,
      driver,
    );
  }

  await connection.end();
  return true;
}

const definesFilePath = './src/database/schema.defines.ts';
const outputDir = './src/database/tables';

if (!fs.existsSync(definesFilePath)) {
  console.error('[db:generateModels] Missing schema.defines.ts — run kysely-codegen first.');
  process.exit(1);
}

generateTableClasses(definesFilePath, outputDir);
