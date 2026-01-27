import { sql, OperatorMap, PaginationResult, PaginationSettings } from '../defines';
import { binToUuid, generateUUID7, uuidToBin } from '@server/lib/strings';
import Mysql from '../index';
import {
  applyDynamicFilters,
  applyDynamicSorts,
  SortCondition,
  UniversalBuilder,
  WhereCondition,
} from '../methods';
import {
  createSelectQueryBuilder,
  SelectQueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,
  RawBuilder,
} from 'kysely';

import MysqlTableEntry from './entry';
import { getCurrentTimestamp } from '@server/lib/datetime';
import {
  DEFAULT_SELECT_LIMIT,
  MysqlInsertResult,
  PrimaryKeyType,
  TableFieldsArray,
  TableName,
} from './defines';

/**
 * proxy exports
 *
 */
export type {
  MysqlInsertResult,
  PrimaryKeyType,
  TableFieldsArray,
  TableName,
  WhereCondition,
  SortCondition,
};

/**
 * this is the main sql table class wrapper.
 *
 */
export default class MysqlTable {
  private primaryKey: string = '';
  private tableName: string = '';
  private alias: string = '';
  protected fields: TableFieldsArray = [];
  protected uuidFields: TableFieldsArray = [];
  protected foreignKeys: Record<string, TableName> = {};

  protected primaryKeyType: PrimaryKeyType = 'number';
  protected enableTimestamps: boolean = false;
  protected deletedTimestampFld = 'deleted_at';
  protected updatedTimestampFld = 'updated_at';
  protected createdTimestampFld = 'created_at';

  constructor(tableName: string, primaryKey: string, alias = '') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.alias = alias;
  }

  /**
   * returns the table name
   *
   * @returns
   */
  getTableName() {
    return this.tableName;
  }

  /**
   * returns the primary key name
   *
   * @returns
   */
  getPrimaryKey() {
    return this.primaryKey;
  }

  /**
   * lists the fields of the table
   *
   * @returns
   */
  getFields() {
    return this.fields;
  }

  /**
   * outputs the current mysql db instance. this is reliant on the main module proxy.
   *
   * @returns
   */
  db() {
    return Mysql;
  }

  /**
   * check if primary key is uuid
   *
   * @returns {boolean}
   */
  public isPrimaryKeyUUID() {
    return this.primaryKeyType === 'uuid';
  }

  /**
   * define the alias
   *
   * @param alias
   */
  public setAlias(alias = '') {
    this.alias = alias;
  }

  /**
   * creates a kysely object for `INSERT` query
   *
   * @returns
   */
  public createInsertQuery() {
    return this.db().getDb().insertInto(this.getTableName());
  }

  /**
   * creates a kysely object for `UPDATE` query
   *
   * @returns
   */
  public createUpdateQuery() {
    return this.db().getDb().updateTable(this.getTableName());
  }

  /**
   * creates a kysely object for `DELETE` query
   *
   * @returns
   */
  public createDeleteQuery() {
    return this.db().getDb().deleteFrom(this.getTableName());
  }

  /**
   * gets the current table count.
   *
   * @param qb - optional. if needed to be used with a query builder, just pass the existing query builder.
   * @returns
   */
  public async getTableCount(qb: SelectQueryBuilder<any, any, any> = null) {
    if (qb === null) {
      qb = this.select();
    }

    const tq = qb.select([sql`COUNT(*)`.as('totalDocs')]);
    const tqResult = await tq.executeTakeFirst();
    const totalDocs = tqResult.totalDocs ? Number(tqResult.totalDocs) : 0;

    return totalDocs;
  }

  /**
   * checks if this field is valid.
   *
   * @param fieldName
   * @returns
   */
  public isValidField(fieldName: string | PrimaryKeyType) {
    return this.fields.includes(fieldName);
  }

  /**
   * builds a parameter object that will be ready to be used for creates/updates
   *
   * @param parameters
   * @returns
   */
  private buildParameters<T extends object>(parameters: any) {
    // Filter the parameter object based on the current key list.
    const filtered = Object.keys(parameters)
      .filter((key) => this.isValidField(key))
      .reduce((filteredObj, key) => {
        filteredObj[key as keyof T] = parameters[key as keyof T];
        return filteredObj;
      }, {} as Partial<T>);

    return filtered;
  }

  /**
   * apply dynamic filters to the table
   *
   * @param qb
   * @param conditions
   * @returns
   */
  private applyWhereCondition(qb: UniversalBuilder, conditions: WhereCondition): UniversalBuilder {
    const pk = this.getPrimaryKey();
    const isUUID = this.isPrimaryKeyUUID();
    let filteredQuery: any = qb;

    const prepareEntry = (column: string, val: any) => {
      const isPk = column === pk && isUUID;
      // Ensure we are checking for a literal null, not a string "null"
      const isValueNull = val === null;
      const shouldTransform = isPk && !isValueNull && typeof val === 'string';

      return {
        columnRef: isPk ? sql.ref(column) : column,
        value: shouldTransform ? sql`UUID_TO_BIN(${val})` : val,
        isValueNull,
      };
    };

    for (const [key, value] of Object.entries(conditions)) {
      if (key.startsWith('$')) {
        const sqlOperator = OperatorMap[key];
        if (!sqlOperator || value === undefined) continue;

        for (const [column, val] of Object.entries(value as object)) {
          const { columnRef, value: finalVal, isValueNull } = prepareEntry(column, val);

          // FORCED FIX: If value is null and operator is '=', use 'is'
          const op =
            isValueNull && sqlOperator === '='
              ? 'is'
              : isValueNull && (sqlOperator === '!=' || sqlOperator === '<>')
                ? 'is not'
                : sqlOperator;

          filteredQuery = filteredQuery.where(columnRef, op as any, finalVal);
        }
      } else {
        const { columnRef, value: finalVal, isValueNull } = prepareEntry(key, value);

        // FORCED FIX: Handle shorthand nulls
        const op = isValueNull ? 'is' : '=';

        filteredQuery = filteredQuery.where(columnRef, op as any, finalVal);
      }
    }

    return filteredQuery;
  }

  /**
   * Pure helper to decorate the input data with UUIDs and Timestamps
   */
  private prepareInsertRecord(input: any, uuid: string): Record<string, any> {
    const now = getCurrentTimestamp();
    const record = { ...this.buildParameters(input) };
    const pk = this.getPrimaryKey();

    // Primary Key Injection
    if (this.isPrimaryKeyUUID()) {
      record[pk] = this.db().sql(`UUID_TO_BIN('${uuid}')`);
    }

    // Automated Timestamps
    if (this.isValidField(this.createdTimestampFld)) record[this.createdTimestampFld] = now;
    if (this.isValidField(this.updatedTimestampFld)) record[this.updatedTimestampFld] = now;

    return record;
  }

  /**
   * executes an insert query
   *
   * @param parameters
   * @returns
   */
  public async insert<T extends Record<string, any>>(parameters: T): Promise<MysqlInsertResult> {
    const db = this.db().getDb();
    const uuid = generateUUID7();
    const pk = this.getPrimaryKey();

    const record = this.prepareInsertRecord(parameters, uuid);
    const result = await db.insertInto(this.getTableName()).values(record).executeTakeFirst();
    const insertId = this.isPrimaryKeyUUID() ? uuid : (result.insertId?.toString() ?? record[pk]);

    return {
      insertId,
      insertParameters: record,
      isCreated: Number(result.numInsertedOrUpdatedRows) > 0,
    };
  }

  /**
   * creates a new entry. it does the insert and then fetch the entry (so 2 sql ops)
   *
   * @param parameters
   * @returns
   */
  public async create(parameters: any) {
    const insertData = await this.insert(parameters);
    if (!insertData?.isCreated) {
      return null;
    }

    // fetch data
    const newEntry = await this.selectById(insertData?.insertId);
    return newEntry;
  }

  /**
   * generates an select kysely query object
   *
   * @param customAlias
   * @returns
   */
  public select(customAlias = '') {
    const alias = customAlias.length > 0 ? customAlias : this.alias;
    let tableName = this.getTableName();

    if (alias.length > 0) {
      tableName += ` as ${alias}`;
    }

    return this.db().getDb().selectFrom(tableName);
  }

  /**
   * runs a select query
   *
   * @param condition
   * @param selectFields
   * @param sortCondition
   * @param limit
   * @returns
   */
  public async selectWhere(
    condition: WhereCondition = {},
    selectFields = [],
    sortCondition: SortCondition = {},
    limit = DEFAULT_SELECT_LIMIT,
  ) {
    const pk = this.getPrimaryKey();
    let stmt = this.select();

    // set the conditions
    stmt = this.applyWhereCondition(stmt, condition) as SelectQueryBuilder<any, any, any>;

    // apply sorting
    stmt = applyDynamicSorts(stmt, sortCondition) as SelectQueryBuilder<any, any, any>;

    // set the select fields
    stmt = selectFields.length === 0 ? stmt.selectAll() : stmt.select(selectFields);

    // override uuid if so
    if (this.isPrimaryKeyUUID()) {
      if (condition[pk]) {
        condition[pk] = uuidToBin(condition[pk]);
      }
      // const selecter = sql<string>`BIN_TO_UUID(${sql.ref(pk)})`;
      // selectStmt = selectStmt.select([selecter.as(pk)]);
    }

    // append the limit
    stmt = stmt.limit(limit);

    // run said query
    const results = await stmt.execute();

    const cleanedUpResults = results.map((result) => {
      if (this.isPrimaryKeyUUID()) {
        result[pk] = binToUuid(result[pk]);
      }
      return { ...result };
    });

    return cleanedUpResults; // selectStmt.compile().sql;
  }

  /**
   * select by a single field.
   *
   * @param fieldName
   * @param value
   * @param selectFields
   * @param pickSingle - true if just to select a single entry, false if to return all entries
   */
  public async selectByField(
    fieldName: string,
    value: any,
    selectFields = [],
    pickSingle = false,
  ): Promise<any | null> {
    if (!this.isValidField(fieldName)) {
      return null;
    }

    const queryResults = await this.selectWhere({ [fieldName]: value }, selectFields);
    if (!pickSingle) {
      return queryResults;
    }

    const [firstRecord] = queryResults;
    return firstRecord ?? null;
  }

  /**
   * select by a single field.
   *
   * @param fieldName
   * @param value
   * @param selectFields
   * @param pickSingle - true if just to select a single entry, false if to return all entries
   */
  public async selectOneByField(
    fieldName: string,
    value: any,
    selectFields = [],
  ): Promise<any | null> {
    if (!this.isValidField(fieldName)) {
      return null;
    }

    const queryResults = await this.selectWhere({ [fieldName]: value }, selectFields);
    const [firstRecord] = queryResults;
    return firstRecord ?? null;
  }

  /**
   * select a single entry by primary key id
   *
   * @param id
   * @param selectFields
   * @returns
   */
  public async selectById(id: any, selectFields = []) {
    return this.selectByField(this.getPrimaryKey(), id, selectFields, true);
  }

  /**
   * generates an update kysely query object
   *
   * @returns
   */
  public update() {
    return this.db().getDb().updateTable(this.getTableName());
  }

  /**
   * run an update query
   *
   * @param conditions
   * @param updateParameters
   * @returns
   */
  public async updateWhere(conditions: WhereCondition = {}, updateParameters = {}) {
    const stmt = this.update();
    const updateQuery = this.applyWhereCondition(stmt, conditions) as UpdateQueryBuilder<
      any,
      any,
      any,
      any
    >;

    const paramUpdateQuery = updateQuery.set(updateParameters);
    const updateResult = await paramUpdateQuery.executeTakeFirst();

    return {
      updatedRows: updateResult.numUpdatedRows ? Number(updateResult.numUpdatedRows) : 0,
      changedRows: updateResult.numChangedRows ? Number(updateResult.numChangedRows) : 0,
    };
  }

  /**
   * update single entry by id
   *
   * @param id
   * @param updateParameters
   * @returns
   */
  public async updateById(id: string | number, updateParameters = {}) {
    return this.updateWhere({ [this.getPrimaryKey()]: id }, updateParameters);
  }

  /**
   * generates an DELETE kysely query object
   *
   * @returns
   */
  public delete() {
    return this.db().getDb().deleteFrom(this.getTableName());
  }

  /**
   * run delete query
   *
   * @param conditions
   * @param forceDelete
   * @returns
   */
  public async deleteWhere(conditions: WhereCondition = {}, forceDelete = false) {
    if (!forceDelete) {
      const updates = await this.updateWhere(conditions, {
        [this.deletedTimestampFld]: getCurrentTimestamp(),
      });
      return { deletedRows: updates.changedRows };
    }

    const stmt = this.delete();
    let deleteQuery = this.applyWhereCondition(stmt, conditions) as DeleteQueryBuilder<
      any,
      any,
      any
    >;

    const results = await deleteQuery.executeTakeFirst();
    const deletedRows = results.numDeletedRows ? Number(results.numDeletedRows) : 0;
    return { deletedRows };
  }

  /**
   * delete single entry by id
   *
   * @param id
   * @param forceDelete
   * @returns
   */
  public async deleteById(id: string | number, forceDelete = false) {
    return this.deleteWhere({ [this.getPrimaryKey()]: id }, forceDelete);
  }

  /**
   * output a pagination query
   *
   * @param page
   * @param pageCount
   * @param settings
   * @param transformer
   * @returns
   */
  public async paginate(
    page = 1,
    pageCount = 10,
    settings: PaginationSettings = {},
    transformer?: (qb: SelectQueryBuilder<any, any, any>) => SelectQueryBuilder<any, any, any>,
  ): Promise<PaginationResult> {
    let query = this.select();
    const offset = (page - 1) * pageCount;
    const selectFields = settings?.select ?? [];
    const includeSoftDeletes = !!settings.includeSoftDeletes;

    // append the soft delete
    if (!includeSoftDeletes) {
      query = query.where(this.deletedTimestampFld, 'is', null);
    }

    // apply the transformer
    if (typeof transformer === 'function') {
      query = transformer(query);
    }

    // Get the total documents first.
    const tq = query.select([sql`COUNT(*)`.as('totalDocs')]);
    const tqResult = await tq.executeTakeFirst();
    const totalDocs = tqResult.totalDocs ? Number(tqResult.totalDocs) : 0;

    // clean up main query for uuid and page and offset
    let pageQuery = selectFields.length > 0 ? query.select(selectFields) : query.selectAll();
    if (this.isPrimaryKeyUUID()) {
      const pk = this.getPrimaryKey();
      const selecter = sql<string>`BIN_TO_UUID(${sql.ref(pk)})`;
      pageQuery = pageQuery.select([selecter.as(pk)]);
    }
    pageQuery = pageQuery.limit(pageCount).offset(offset);

    // execute the actual query
    const items = await pageQuery.execute();

    // collect the other pagination data
    const totalPages = Math.ceil(totalDocs / pageCount);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      page,
      totalPages,
      items,
      totalDocs,
      limit: pageCount,
      prevPage: hasPrevPage ? page - 1 : null,
      nextPage: hasNextPage ? page + 1 : null,
      hasPrevPage,
      hasNextPage,
    };
  }

  /**
   * convert uuid to binary stream
   *
   * @param uuid
   * @returns
   */
  public uuidToBin(uuid: string): Buffer {
    return uuidToBin(uuid);
  }

  /**
   * convert binary to uuid
   *
   * @param bin
   * @returns
   */
  public binToUuid(bin: Buffer): string {
    return binToUuid(bin);
  }

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  public async getEntryById(id: string | number): Promise<MysqlTableEntry> {
    const entry = new MysqlTableEntry(this);
    await entry.fetchById(id);

    return entry;
  }
}
