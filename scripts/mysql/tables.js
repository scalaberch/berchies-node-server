require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

/**
 * Same rules as `server/modules/mysql/uuidAuto.ts` `isMysqlUuidAuto` — codegen reads `process.env`
 * after `dotenv` so generated interfaces match the runtime UUID string layer.
 */
function isMysqlUuidAutoEnv() {
  const raw = process.env.MYSQL_UUID_AUTO;
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) {
    return true;
  }
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') {
    return false;
  }
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/** @param {Record<string, string>} fieldDefines */
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

function resolvePrimaryKeyTableType(fieldTypeMap, primaryKey) {
  const t = fieldTypeMap[primaryKey];
  if (isBufferColumnType(t)) {
    return 'uuid';
  }
  return t || 'number';
}

/** True when kysely-codegen typed the column as BINARY / UUID (possibly `| null`). */
function isBufferColumnType(resolved) {
  const s = String(resolved).trim();
  return s === 'Buffer' || /^Buffer\s*\|/.test(s);
}

/** Field names that are `Buffer` (or `Buffer | null`) in mysql.defines — treat as UUID strings in table interfaces. */
function getBufferUuidFieldNames(fieldTypeMap, fieldNames) {
  return fieldNames.filter((f) => isBufferColumnType(fieldTypeMap[f]));
}

/** App-layer type for a BINARY UUID column (`string` or `string | null` when nullable in defines). */
function appLayerUuidTypeForField(resolvedType) {
  const s = String(resolvedType);
  return /\|\s*null\b/.test(s) ? 'string | null' : 'string';
}

function buildInterfaceDeclaration(modelName, fieldTypeMap, bufferFieldNames) {
  const useStringUuids = isMysqlUuidAutoEnv() && bufferFieldNames.length > 0;
  if (!useStringUuids) {
    return `export interface ${modelName}Interface extends Partial<BaseInterface> {}`;
  }
  const omitKeys = bufferFieldNames.map((k) => `'${k}'`).join(' | ');
  const members = bufferFieldNames
    .map((k) => `  ${k}?: ${appLayerUuidTypeForField(fieldTypeMap[k])};`)
    .join('\n');
  return `/** When MYSQL_UUID_AUTO is on: BINARY UUID columns as strings (see server/modules/mysql/uuidAuto.ts). */
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

/**
 * Full contents of one `*Table.ts` file.
 * @param {{
 *   modelName: string;
 *   tableName: string;
 *   primaryKey: string;
 *   fieldNames: string[];
 *   pkType: string;
 *   fieldTypeMap: Record<string, string>;
 * }} p
 */
function buildMysqlTableSource(p) {
  const { modelName, tableName, primaryKey, fieldNames, pkType, fieldTypeMap } = p;
  const fieldsLiteral = formatFieldsArray(fieldNames);
  const bufferFieldNames = getBufferUuidFieldNames(fieldTypeMap, fieldNames);
  const interfaceBlock = buildInterfaceDeclaration(modelName, fieldTypeMap, bufferFieldNames);

  return `/**
 * Auto-generated model for table ${tableName}
 * Do not edit — run: npm run mysql:generateModels
 */

import { ${modelName} as BaseInterface } from '../mysql.defines';
import MysqlTable, {
  PrimaryKeyType,
  MysqlInsertResult,
  TableName,
  WhereCondition,
  SortCondition,
} from '@server/modules/mysql/table';

export const tableName = '${tableName}';
export const tablePrimaryKey = '${primaryKey}';

${interfaceBlock}
export type ${modelName}Field = keyof ${modelName}Interface;

export type ${modelName}WhereCondition = WhereCondition & {
  [K in ${modelName}Field]?: any;
};

export class ${modelName}MysqlTable extends MysqlTable {
  protected primaryKeyType: PrimaryKeyType = '${pkType}';
  protected fields: ${modelName}Field[] = ${fieldsLiteral};
  protected uuidFields: ${modelName}Field[] = [];
  protected foreignKeys: Record<string, TableName> = {};

  insert(params: ${modelName}Interface): Promise<MysqlInsertResult> {
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

const ${modelName}Table = new ${modelName}MysqlTable(tableName, tablePrimaryKey);
export default ${modelName}Table;
`;
}

async function generateClassContent(classObject, outputDir) {
  const { modelName, tableName, primaryKey, fieldDefines } = classObject;
  const fieldNames = Object.keys(fieldDefines);
  const fieldTypeMap = buildFieldTypeMap(fieldDefines);
  const pkType = resolvePrimaryKeyTableType(fieldTypeMap, primaryKey);

  const source = buildMysqlTableSource({
    modelName,
    tableName,
    primaryKey,
    fieldNames,
    pkType,
    fieldTypeMap,
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

  return {
    modelMap,
    tableClassMap,
  };
}

async function getTablePrimaryKey(connection, tableName = '') {
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

async function generateTableClasses(definesFilePath, outputDir, dbConfig) {
  let tableFieldMap = {};
  try {
    tableFieldMap = getTableMap(definesFilePath);
  } catch (error) {
    console.error('Error generating table classes:', error);
    return false;
  }

  const { tableClassMap, modelMap } = tableFieldMap;
  const connection = await mysql.createConnection(dbConfig);

  for (const modelName of Object.keys(tableClassMap)) {
    const sqlTableName = tableClassMap[modelName];
    const fieldDefines = modelMap[modelName];

    const primaryKey = await getTablePrimaryKey(connection, sqlTableName);

    await generateClassContent(
      {
        modelName,
        tableName: sqlTableName,
        primaryKey,
        fieldDefines,
      },
      outputDir,
    );
  }

  await connection.end();
}

function isRunningInDocker() {
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    return /docker|kubepods/.test(cgroup);
  } catch {
    return false;
  }
}

const definesFilePath = './src/database/mysql.defines.ts';
const outputDir = './src/database/tables';
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
};

if (process.env.ENV === 'dev' || process.env.ENV === 'local') {
  if (!isRunningInDocker()) {
    dbConfig.host = '127.0.0.1';
  }
}

generateTableClasses(definesFilePath, outputDir, dbConfig);
