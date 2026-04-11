require('dotenv').config();

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const timestampFields = ['created_at', 'updated_at', 'deleted_at'];
const classTemplate = `/**
*
* Auto-generated model for table <tableName>
* Do not modify this class.
*
**/

import { <modelName> as BaseInterface } from '../mysql.defines';
import MysqlTable, { PrimaryKeyType, MysqlInsertResult, TableName, WhereCondition, SortCondition } from "@server/modules/mysql/table";

export const tableName = "<tableName>";
export const tablePrimaryKey = "<primaryKey>";

export interface <modelName>Interface extends Partial<BaseInterface> {}
export type <modelName>Field = keyof <modelName>Interface;

export type <modelName>WhereCondition = WhereCondition & {
  [K in <modelName>Field]?: any;
};

export class <modelName>MysqlTable extends MysqlTable {
  protected primaryKeyType: PrimaryKeyType = '<pkType>';
  protected fields: <modelName>Field[] = <fields>;
  protected uuidFields: <modelName>Field[] = [<uuidFields>];
  protected foreignKeys: Record<string, TableName> = {<fks>};

  public insert(params: <modelName>Interface): Promise<MysqlInsertResult> {
   return super.insert(params)
  }

  public create(params: <modelName>Interface): Promise<<modelName>Interface | null> {
   return super.create(params)
  }

  public selectWhere(
    condition: <modelName>WhereCondition = {},
    selectFields = [],
    sortCondition: SortCondition = {},
    limit = 100,
  ) {
    return super.selectWhere(condition, selectFields, sortCondition, limit) as Promise<<modelName>Interface[]>;
  }

  public selectById(id: any, selectFields: <modelName>Field[] = []) {
    return super.selectById(id, selectFields) as Promise<<modelName>Interface | null>;
  }

  //public updateById(id: PrimaryKeyType, params: <modelName>Interface) {
  // return super.update(id, params)
  //}

  //public getByField(field: <modelName>Field, value: any, selectFields: <modelName>Field[] = []): Promise<<modelName>Interface | null> {
  //  return super.selectByField(field, value, selectFields)
  //}

  //public get<modelName>(id: PrimaryKeyType, selectFields: <modelName>Field[] = []): Promise<<modelName>Interface | null> {
  //  return super.selectById(id, selectFields);
  //}

  //public create<modelName>(<paramChain>): Promise<<modelName>Interface | null> {
  //  return this.create({
  //    <paramColumns>
  //  });
  //}

  //public update<modelName>(<primaryKey>: <pkType>, <paramChain>) {
  //  return this.update(<primaryKey>, {
  //    <paramColumns>
  //  });
  //}
}

const <modelName>Table = new <modelName>MysqlTable(tableName, tablePrimaryKey);
export default <modelName>Table;
`;

/**
 *
 * @param {*} classObject
 */
async function generateClassContent(classObject) {
  const { modelName, tableName, primaryKey, fieldDefines, columns } = classObject;

  // console.log(classObject)

  const fields = Object.keys(fieldDefines);
  let classContent = classTemplate.replaceAll('<modelName>', modelName);
  classContent = classContent.replaceAll('<primaryKey>', primaryKey);
  classContent = classContent.replaceAll('<tableName>', tableName);

  // generate the fields stuff properly.
  const fieldsStrList = fields.reduce((str, fld, index) => {
    let newStr = index === 0 ? `` : `,`;
    newStr += `\n\t\t'${fld}'`;
    return str + newStr;
  }, '');
  const fieldsStr = `[${fieldsStrList}\n\t]`;
  classContent = classContent.replaceAll('<fields>', fieldsStr);

  // identify the generated fields and set a field map
  const regex = /^Generated<([^,]+(?:,[^,]+)*)>$/;
  const fieldMap = fields.reduce((mapObj, field) => {
    let fieldType = `${fieldDefines[field]}`;
    const matches = fieldType.match(regex);

    if (matches) {
      const [wholeMatch, typeMatch] = matches;
      fieldType = typeMatch;
    }

    return { ...mapObj, [field]: fieldType };
  }, {});

  // identify primary key type
  let pkType = fieldMap[primaryKey];
  if (pkType === 'Buffer') {
    pkType = 'uuid';
  }
  classContent = classContent.replaceAll('<pkType>', pkType);
  classContent = classContent.replaceAll('<isUuid>', pkType === 'string' || pkType === 'uuid');

  // add uuid fields here
  // uuidFields
  classContent = classContent.replaceAll('<uuidFields>', '');

  // add foreign keys here
  classContent = classContent.replaceAll('<fks>', '');

  // setup helper creaters
  const columnParams = columns.filter(
    (column) => column !== primaryKey && timestampFields.indexOf(column) < 0,
  );
  const paramChain = columnParams.map((column) => {
    return `${column}?: ${fieldMap[column]}`;
  });
  classContent = classContent.replaceAll('<paramChain>', paramChain.join(', '));
  classContent = classContent.replaceAll('<paramColumns>', columnParams.join(', '));

  // Write to file.
  const fileName = `${modelName.toLowerCase()}Table.ts`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, classContent);
}

/**
 *
 * @param {*} definesFilePath
 * @returns
 */
function getTableMap(definesFilePath) {
  // Extract table interfaces using a regular expression
  const definesContent = fs.readFileSync(definesFilePath, 'utf8');
  const tableRegex = /export interface (\w+) {([\s\S]*?)}/g;

  const modelMap = {};
  let tableClassMap = {};
  let match;

  while ((match = tableRegex.exec(definesContent)) !== null) {
    const [tableMatch, tableName, tableFields] = match;
    const isMainDb = tableName === 'DB';

    // Extract field names
    const fieldRegex = /(\w+):\s*(.+?);/g;
    let fieldMatch;

    const fieldTypeMap = {};
    while ((fieldMatch = fieldRegex.exec(tableFields)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].trim(); // Capture and trim the type

      if (isMainDb) {
        fieldTypeMap[fieldType] = fieldName;
      } else {
        fieldTypeMap[fieldName] = fieldType;
      }
    }

    if (isMainDb) {
      tableClassMap = fieldTypeMap;
    } else {
      modelMap[tableName] = fieldTypeMap;
    }
  }

  return {
    modelMap,
    tableClassMap,
  };
}

/**
 * get primary key information of a table
 *
 * @param {*} connection
 * @param {*} tableName
 * @returns
 */
async function getTablePrimaryKey(connection, tableName = '') {
  let primaryKey = '';

  try {
    const [primaryKeyResult] = await connection.execute(
      `SHOW KEYS FROM ${tableName.trim()} WHERE Key_name = 'PRIMARY'`,
    );
    if (primaryKeyResult.length > 0) {
      primaryKey = primaryKeyResult[0].Column_name;
    }
  } catch (dbError) {
    console.error(`Error getting primary key for ${tableName}:`, dbError);
  }

  return primaryKey;
}

/**
 *
 * @param {*} connection
 * @param {*} tableName
 * @returns
 */
async function getColumnsOfTable(connection, tableName = '') {
  const columns = [];

  try {
    const [tablesResult] = await connection.execute(`SHOW COLUMNS FROM ${tableName.trim()}`);
    return tablesResult.map((table) => {
      console.log(table);
      return table.Field;
    });
  } catch (dbError) {
    console.error(`Error getting columns for ${tableName}:`, dbError);
  }

  return columns;
}

/**
 * main function to generate table class files
 *
 * @param {*} definesFilePath
 * @param {*} outputDir
 * @param {*} dbConfig
 * @returns
 */
async function generateTableClasses(definesFilePath, outputDir, dbConfig) {
  // Get the field maps
  let tableFieldMap = {};
  try {
    tableFieldMap = getTableMap(definesFilePath);
  } catch (error) {
    console.error('Error generating table classes:', error);
    return false;
  }

  const { tableClassMap, modelMap } = tableFieldMap;
  const connection = await mysql.createConnection(dbConfig); // Use dbConfig here

  for (const modelName in tableClassMap) {
    const tableName = tableClassMap[modelName];
    const fieldDefines = modelMap[modelName];

    const primaryKey = await getTablePrimaryKey(connection, tableName);
    const columns = await getColumnsOfTable(connection, tableName);

    const defineObject = {
      modelName,
      tableName,
      primaryKey,
      fieldDefines,
      columns,
    };

    // Create the model file.
    await generateClassContent(defineObject);
  }

  // Kill connection.
  await connection.end();
}

/**
 * helper function if process is running in docker
 *
 * @returns
 */
function isRunningInDocker() {
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    return /docker|kubepods/.test(cgroup); // Checks for Docker or Kubernetes references
  } catch (err) {
    return false; // If reading /proc/1/cgroup fails, assume not inside Docker
  }
}

/**
 * executable variables
 *
 */
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

// main function
generateTableClasses(definesFilePath, outputDir, dbConfig);
