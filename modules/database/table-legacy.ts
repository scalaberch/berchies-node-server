// import _ from "lodash";
// import moment from "moment";
// import { getCurrentTimestamp } from "@server/lib/datetime";

// import {
//   WhereParameters,
//   EbgMysqlFieldType,
//   EbgMysqlIdType,
//   EbgMysqlTableKeysArray,
//   ListParameters,
//   CreateUpdateFlag
// } from './defines';

// import { Kysely, SelectQueryBuilder, Selectable, sql, ExpressionBuilder } from 'kysely';
// import { mysql } from "./index"

// export class MysqlTableEntry {
//   private attributes = {};
//   private row = {};
//   private id: EbgMysqlIdType = null;
//   private tableRef: MysqlTable;
//   private queryBuilder;

//   constructor(tableRef, id: EbgMysqlIdType, loadData = false) {
//     this.id = id;
//     this.tableRef = tableRef;
//   }

//   public async load(id: EbgMysqlIdType | null = null) {
//     const entry = await this.tableRef.getById(id === null ? this.id : id);
//     if (entry !== null) {
//       this.row = entry;
//     }

//     this.id = id;
//     return this;
//   }

//   public getData() {
//     return this.row;
//   }

//   public get(key: string) {
//     return _.get(this.row, key, null);
//   }

//   public set(key: string, value: any, autoSave = false) {
//     _.set(this.row, key, value);

//     if (autoSave) {
//       this.save();
//     }
//   }

//   public async save() {}

//   public async delete() {}

//   public doesExist() {
//     // @todo: compare this to the primary key of the table, not "id" explicitly
//     if (!this.row.hasOwnProperty('id')) {
//       return false;
//     }

//     // Check if there's a deleted_at entry.
//     const deletedTimestampFld = this.tableRef.getDeletedTimestampFld();
//     if (this.row.hasOwnProperty(deletedTimestampFld)) {
//       const fld = _.get(this.row, deletedTimestampFld, null);
//       return fld === null;
//     }

//     return true;
//   }
// }

// export class MysqlTable {
//   private primaryKey: string = '';
//   private tableName: string = '';
//   protected primaryKeyType: string = 'number';
//   protected fields: EbgMysqlTableKeysArray = [];

//   protected enableTimestamps: boolean = false;
//   protected deletedTimestampFld = 'deleted_at';
//   protected updatedTimestampFld = 'updated_at';
//   protected createdTimestampFld = 'created_at';

//   /**
//    * constructor
//    *
//    * @param tableName
//    * @param primaryKey
//    */
//   constructor(tableName: string, primaryKey: string) {
//     this.tableName = tableName;
//     this.primaryKey = primaryKey;
//   }

//   /**
//    * gets the kysely db instance
//    *
//    * @returns
//    */
//   public getDbInstance() {
//     return mysql().getDb();
//   }

//   /**
//    *
//    * @returns
//    */
//   public row() {
//     return new MysqlTableEntry(this, null);
//   }

//   /**
//    * gets the fields of this table, which is inside an array
//    *
//    * @returns
//    */
//   public getFields() {
//     return this.fields;
//   }

//   /**
//    * gets the table name
//    *
//    * @returns
//    */
//   public getTableName(alias = '') {
//     if (alias.length > 0) {
//       return `${this.tableName} as ${alias}`;
//     }
//     return this.tableName;
//   }

//   /**
//    * gets the primary key name
//    *
//    * @returns
//    */
//   public getPrimaryKey() {
//     return this.primaryKey;
//   }

//   /**
//    * output a raw sql. some helper function
//    *
//    * @deprecated
//    * @param rawSql
//    * @returns
//    */
//   public rawSql(rawSql = '') {
//     return sql<any>`${sql.raw(rawSql)}`;
//   }

//   /**
//    *
//    * @param alias
//    * @returns
//    */
//   public generateSelectCountAll(alias = 'count') {
//     return sql<number>`COUNT(*)`.as(alias);
//   }

//   /**
//    * enable timestamp
//    *
//    * @param enableTimestamp
//    */
//   public setEnableTimestamps(enableTimestamp: boolean) {
//     this.enableTimestamps = enableTimestamp;
//   }

//   public getDeletedTimestampFld() {
//     return this.deletedTimestampFld;
//   }

//   /**
//    * checks if this field is valid.
//    *
//    * @param fieldName
//    * @returns
//    */
//   public isValidField(fieldName: string | EbgMysqlFieldType) {
//     return this.fields.includes(fieldName);
//   }

//   /**
//    * builds a parameter object that will be ready to be used for creates/updates
//    *
//    * @param parameters
//    * @returns
//    */
//   protected buildParameters<T extends object>(parameters: any) {
//     // Filter the parameter object based on the current key list.
//     const filtered = Object.keys(parameters)
//       .filter((key) => this.isValidField(key))
//       .reduce((filteredObj, key) => {
//         filteredObj[key as keyof T] = parameters[key as keyof T];
//         return filteredObj;
//       }, {} as Partial<T>);

//     return filtered;
//   }

//   /**
//    * get table count/size
//    *
//    * @param queryBuilderTransformer
//    * @returns
//    */
//   public async count(queryBuilderTransformer?: Function) {
//     const db = this.getDbInstance();
//     let qb = db.selectFrom(this.getTableName()).select([Mysql.sql`COUNT(*)`.as('totalDocs')]);

//     if (typeof queryBuilderTransformer === 'function') {
//       qb = queryBuilderTransformer(qb);
//     }

//     const result = await qb.executeTakeFirst();
//     const totalCount = _.get(result, 'totalDocs', 0) as number;
//     return totalCount;
//   }

//   public loadEntryById(id: EbgMysqlIdType) {
//     return new MysqlTableEntry(this, id);
//   }

//   protected resolveQueryParameters(queryBuilder, parameters: WhereParameters) {
//     Object.keys(parameters).forEach((operator) => {
//       const value = parameters[operator];

//       if (operator === '$or') {
//       }
//     });

//     return queryBuilder;
//   }

//   /**
//    * list items of a table. this is just intended for a simple way to list items. if needed to be a bit compilcated, use ______ instead of this.
//    *
//    * @param countLimit
//    * @param selectFields
//    * @param returnAsQueryBuilder
//    * @returns
//    */
//   public async list(
//     countLimit = 1000,
//     selectFields: EbgMysqlTableKeysArray = [],
//     returnAsQueryBuilder = false,
//   ) {
//     const db = this.getDbInstance();
//     let qb = db.selectFrom(this.getTableName());

//     if (selectFields.length === 0) {
//       qb = qb.selectAll();
//     } else {
//       const selectedFields = selectFields.filter((fld) => this.isValidField(fld)) as any;
//       qb = qb.select(selectedFields);
//     }

//     // Add limits
//     qb = qb.limit(countLimit);

//     // Return if query builder
//     if (returnAsQueryBuilder) {
//       return qb;
//     }

//     const result = await qb.execute();
//     return result;
//   }

//   /**
//    * execute a pagination query
//    *
//    * @param page
//    * @param pageCount
//    * @param queryBuilderTransformer
//    * @param selectFields
//    * @returns
//    */
//   public async paginate(
//     page = 1,
//     pageCount = 10,
//     queryBuilderTransformer?: (
//       qb: SelectQueryBuilder<any, any, any>,
//     ) => SelectQueryBuilder<any, any, any>,
//     selectFields = [],
//   ) {
//     const db = this.getDbInstance();
//     const offset = (page - 1) * pageCount;
//     let qb = db.selectFrom(this.getTableName());

//     if (typeof queryBuilderTransformer === 'function') {
//       qb = queryBuilderTransformer(qb);
//     }

//     // Get the total documents first.
//     const totalQuery = qb.select([Mysql.sql`COUNT(*)`.as('totalDocs')]);
//     const totalQueryResult = await totalQuery.executeTakeFirst();
//     const totalDocs = _.get(totalQueryResult, 'totalDocs', 0) as number;

//     // Execute results.
//     let pagedQuery = selectFields.length > 0 ? qb.select(selectFields) : qb.selectAll();
//     pagedQuery = pagedQuery.limit(Number(pageCount)).offset(offset);

//     // Get count and statistics
//     const items = await pagedQuery.execute();
//     const totalPages = Math.ceil(totalDocs / pageCount);
//     const hasPrevPage = page > 1;
//     const hasNextPage = page < totalPages;

//     return {
//       items,
//       totalDocs,
//       limit: pageCount,
//       page,
//       totalPages,
//       prevPage: hasPrevPage ? page - 1 : null,
//       hasPrevPage,
//       nextPage: hasNextPage ? page + 1 : null,
//       hasNextPage,
//     };
//   }

//   /**
//    * gets a single entry in the table.
//    *
//    * @param id
//    * @param asObject
//    * @param selectFields
//    * @returns
//    */
//   public async getById(
//     id: EbgMysqlIdType,
//     asObject = true,
//     selectFields = [],
//   ): Promise<MysqlTableEntry | {}> {
//     if (asObject) {
//       const db = this.getDbInstance();

//       let qb = db.selectFrom(this.getTableName());
//       qb = selectFields.length > 0 ? qb.select(selectFields) : qb.selectAll();
//       qb = qb.where(this.getPrimaryKey(), '=', id);

//       const entry = await qb.executeTakeFirst();
//       return typeof entry === 'undefined' ? null : entry;
//     }

//     const entry = new MysqlTableEntry(this, id);
//     await entry.load(id);
//     return entry;
//   }

//   public async getWhere(
//     condition: WhereParameters = {},
//     selectFields = [],
//     outputAsQueryBuilder = false,
//   ) {
//     const db = this.getDbInstance();
//     let qb = db.selectFrom(this.getTableName());

//     // Iterate them out
//     qb = convertParameterObjectToWhereStatements(qb, condition);

//     // filter out for select fields
//     qb = selectFields.length === 0 ? qb.selectAll() : qb.select(selectFields);

//     // compile sql
//     const sql = qb.compile().sql;
//     console.log(sql);

//     // // output has query builder
//     // if (outputAsQueryBuilder) {
//     //   return qb;
//     // }

//     // return await qb.execute();
//   }

//   public async select(
//     condition: WhereParameters = {},
//     selectFields = [],
//     outputAsQueryBuilder = false,
//   ) {
//     const db = this.getDbInstance();
//     let qb = db.selectFrom(this.getTableName());

//     // Iterate them out
//     qb = convertParameterObjectToWhereStatements(qb, condition);

//     // filter out for select fields
//     qb = selectFields.length === 0 ? qb.selectAll() : qb.select(selectFields);

//     // compile sql
//     const sql = qb.compile().sql;
//     console.log(sql);

//     // // output has query builder
//     // if (outputAsQueryBuilder) {
//     //   return qb;
//     // }

//     // return await qb.execute();
//   }

//   /**
//    * select an entry by id.
//    *
//    * @param id
//    * @param selectFields
//    * @returns
//    */
//   public async selectById(id: EbgMysqlIdType, selectFields = []) {
//     const pk = this.getPrimaryKey();
//     return this.selectByField(pk, id, selectFields);
//   }

//   /**
//    * select an entry by a single field.
//    *
//    * @param fieldName
//    * @param value
//    * @param selectFields
//    * @returns
//    */
//   public async selectByField(fieldName: string, value: any, selectFields = []) {
//     const db = this.getDbInstance();
//     const tbl = this.getTableName();

//     let query = db.selectFrom(tbl).where(fieldName, '=', value);
//     query = selectFields.length > 0 ? query.select(selectFields) : query.selectAll();

//     const entry = await query.executeTakeFirst();
//     return typeof entry === 'undefined' ? null : entry;
//   }

//   /**
//    * creates a new entry
//    *
//    * @param parameters
//    * @returns
//    */
//   public async create(parameters: any) {
//     const insertData = await this.insert(parameters);
//     if (!insertData?.isCreated) {
//       return null;
//     }

//     // get the data.
//     const newEntry = await this.createSelectQuery()
//       .where(this.getPrimaryKey(), '=', insertData?.insertId)
//       .selectAll()
//       .executeTakeFirst();

//     if (newEntry === undefined) {
//       return null;
//     }

//     return newEntry;
//   }

//   /**
//    * executes an insert query
//    * @todo: convert uuidv4 to v7
//    *
//    * @param parameters
//    * @returns
//    */
//   public async insert(parameters: any) {
//     const db = this.getDbInstance();
//     const insertParameters = this.buildParameters(parameters);

//     // Automatically add something in the primary key
//     const pk = this.getPrimaryKey();
//     insertParameters[pk] = this.primaryKeyType === 'string' ? uuidv4() : null;

//     // create insert statement
//     const qb = db.insertInto(this.getTableName()).values(insertParameters);

//     // insert results
//     const insertResult = await qb.executeTakeFirst();
//     const { insertId: newId, numInsertedOrUpdatedRows } = insertResult;
//     const insertId = typeof newId === 'undefined' ? insertParameters[pk] : newId.toString(); // newId.toString();
//     const isCreated = Number(numInsertedOrUpdatedRows) > 0;

//     return {
//       insertId,
//       insertParameters,
//       isCreated,
//     };
//   }

//   public queryBuilderCreate(parameters: any, db: Kysely<any> = null) {
//     const insertParameters = this.buildParameters(parameters);
//     const pk = this.getPrimaryKey();

//     if (db === null) {
//       db = this.getDbInstance();
//     }

//     // Automatically add something in the primary key
//     insertParameters[pk] = this.primaryKeyType === 'string' ? uuidv4() : null;

//     // create insert statement
//     const qb = db.insertInto(this.getTableName()).values(insertParameters);
//     return qb;
//   }

//   public async createOrUpdate(
//     existingParameters = {},
//     updatedParameters = {},
//     flags: CreateUpdateFlag = {},
//   ) {
//     // find item or items that has the existing parameters
//   }

//   /**
//    * executes an update query
//    *
//    * @param id
//    * @param parameters
//    * @param returnAsQueryBuilder
//    * @returns
//    */
//   public async update(id: EbgMysqlIdType, parameters: any, returnAsQueryBuilder = false) {
//     const db = this.getDbInstance();
//     const updateParameters = this.buildParameters(parameters);

//     // Force remove the primary key from the updateParameters should it exist in there.
//     // You don't want to have duplication in there don't you?
//     const pk = this.getPrimaryKey();
//     if (updateParameters.hasOwnProperty(pk)) {
//       delete updateParameters[pk];
//     }

//     const qb = db.updateTable(this.getTableName()).set(updateParameters).where(pk, '=', id);
//     if (returnAsQueryBuilder) {
//       return qb;
//     }

//     const updateResult = await qb.executeTakeFirst();
//     const { numUpdatedRows, numChangedRows } = updateResult;

//     return {
//       updatedRows: Number(numUpdatedRows.toString()),
//       changedRows: Number(numChangedRows.toString()),
//     };
//   }

//   public async updateWhere(
//     condition: WhereParameters,
//     parameters: any,
//     returnAsQueryBuilder = false,
//   ) {
//     const db = this.getDbInstance();
//   }

//   /**
//    * delete a single entry by id.
//    *
//    * @param id
//    * @param forceDelete
//    */
//   public async delete(id: EbgMysqlIdType, forceDelete = true) {
//     return await this.deleteMany([id], forceDelete);
//   }

//   /**
//    * delete multiple entries, given an array of id's
//    *
//    * @param ids
//    * @param forceDelete
//    */
//   public async deleteMany(ids: EbgMysqlIdType[], forceDelete = true) {
//     const db = this.getDbInstance();
//     const pk = this.getPrimaryKey();
//     const queuedCount = ids.length;
//     let deletedRows = 0;
//     let hasDeleted = false;

//     // check first if the table has a `deleted_at` field so that we can identify if this is
//     //  by default a soft delete table
//     const isByDefaultSoftDelete = this.isValidField(this.deletedTimestampFld);

//     // if not a soft delete table or flag is overriden
//     if (forceDelete || !isByDefaultSoftDelete) {
//       const qb = db.deleteFrom(this.getTableName()).where(pk, 'in', ids);
//       const deleteResult = await qb.executeTakeFirst();
//       const { numDeletedRows } = deleteResult;

//       deletedRows = Number(numDeletedRows.toString());
//       hasDeleted = deletedRows > 0;

//       return {
//         hasDeleted,
//         deletedRows,
//         queuedCount,
//       };
//     }

//     // otherwise just replace it with a timestamp
//     const updateParameters = this.buildParameters({
//       deleted_at: getCurrentTimestamp(),
//     });
//     const qb = db.updateTable(this.getTableName()).set(updateParameters).where(pk, '=', ids);

//     const updateResult = await qb.executeTakeFirst();
//     const { numUpdatedRows, numChangedRows } = updateResult;

//     deletedRows = Number(numChangedRows.toString());
//     hasDeleted = deletedRows > 0;

//     return {
//       hasDeleted,
//       deletedRows,
//       queuedCount,
//     };
//   }

//   public async deleteWhere(condition: WhereParameters = {}, forceDelete = true) {
//     const db = this.getDbInstance();
//     const params = this.buildParameters(condition);
//     let qb = db.deleteFrom(this.getTableName());

//     // Iterate from the condition
//     qb = convertParameterObjectToWhereStatements(qb, condition);

//     const comp = qb.compile();
//     console.log(comp.sql);

//     // .where(({ eb, or, and, not, exists, selectFrom }) => and([
//     //   or([
//     //     eb('first_name', '=', firstName),
//     //     eb('age', '<', maxAge)
//     //   ]),
//     //   not(exists(
//     //     selectFrom('pet')
//     //       .select('pet.id')
//     //       .whereRef('pet.owner_id', '=', 'person.id')
//     //   ))
//     // ]))

//     return {};
//   }

//   /**
//    * creates a kysely object for `SELECT` query
//    *
//    * @param alias - makes an alias on the sql statement (i.e. tableName as alias)
//    * @returns
//    */
//   public createSelectQuery(alias = '') {
//     let tableName = this.getTableName();
//     if (alias.length > 0) {
//       tableName += ` as ${alias}`;
//     }

//     return this.getDbInstance().selectFrom(tableName);
//   }

//   /**
//    * creates a kysely object for `INSERT` query
//    *
//    * @returns
//    */
//   public createInsertQuery() {
//     return this.getDbInstance().insertInto(this.getTableName());
//   }

//   /**
//    * creates a kysely object for `UPDATE` query
//    *
//    * @returns
//    */
//   public createUpdateQuery() {
//     return this.getDbInstance().updateTable(this.getTableName());
//   }

//   /**
//    * creates a kysely object for `DELETE` query
//    *
//    * @returns
//    */
//   public createDeleteQuery() {
//     return this.getDbInstance().deleteFrom(this.getTableName());
//   }
// }
