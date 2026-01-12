import {
  MysqlTableKeysArray,
  sql,
  DEFAULT_SELECT_LIMIT,
  OperatorMap,
  PaginationResult,
  PaginationSettings,
} from '../defines';
import { generateUUID7 } from '@server/lib/strings';
import { mysql } from '..';
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

export type PrimaryKeyType = 'number' | 'string' | 'uuid';

export default class MysqlTable {
  private primaryKey: string = '';
  private tableName: string = '';
  private alias: string = '';
  protected fields: MysqlTableKeysArray = [];

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

  getTableName() {
    return this.tableName;
  }

  getPrimaryKey() {
    return this.primaryKey;
  }

  getFields() {
    return this.fields;
  }

  db() {
    return mysql();
  }

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
   * executes an insert query
   *
   * @param parameters
   * @returns
   */
  public async insert(parameters: any) {
    const db = this.db().getDb();
    const insertParameters = this.buildParameters(parameters);

    // Automatically add something in the primary key
    const pk = this.getPrimaryKey();
    insertParameters[pk] = this.isPrimaryKeyUUID()
      ? this.db().sql(`UUID_TO_BIN('${generateUUID7()}')`)
      : null;

    // automatically set insert and updated timestamps if exists.
    // maybe do this later?

    // create insert statement
    const qb = db.insertInto(this.getTableName()).values(insertParameters);
    const { insertId: newId, numInsertedOrUpdatedRows } = await qb.executeTakeFirst();

    // insert results
    const insertId = typeof newId === 'undefined' ? insertParameters[pk] : newId.toString();
    const isCreated = Number(numInsertedOrUpdatedRows) > 0;

    return {
      insertId,
      insertParameters,
      isCreated,
    };
  }

  /**
   * creates a new entry
   *
   * @param parameters
   * @returns
   */
  public async create(parameters: any) {
    const insertData = await this.insert(parameters);
    if (!insertData?.isCreated) {
      return null;
    }

    // // get the data.
    // const newEntry = await this.createSelectQuery()
    //   .where(this.getPrimaryKey(), "=", insertData?.insertId)
    //   .selectAll()
    //   .executeTakeFirst();

    // if (newEntry === undefined) {
    //   return null;
    // }

    // return newEntry;
    return null;
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
    let selectStmt = this.select();

    // set the conditions
    selectStmt = this.applyWhereCondition(selectStmt, condition) as SelectQueryBuilder<
      any,
      any,
      any
    >;

    // apply sorting
    selectStmt = applyDynamicSorts(selectStmt, sortCondition) as SelectQueryBuilder<any, any, any>;

    // set the select fields
    selectStmt =
      selectFields.length === 0 ? selectStmt.selectAll() : selectStmt.select(selectFields);

    // override uuid if so
    if (this.isPrimaryKeyUUID()) {
      const pk = this.getPrimaryKey();
      const selecter = sql<string>`BIN_TO_UUID(${sql.ref(pk)})`;
      selectStmt = selectStmt.select([selecter.as(pk)]);
    }

    // append the limit
    selectStmt = selectStmt.limit(limit);

    const comple = selectStmt.compile();
    console.log(comple.sql);
    console.log(comple.parameters);

    // run said query
    const results = await selectStmt.execute();
    return results; // selectStmt.compile().sql;
  }

  /**
   * select a single entry by a single field.
   *
   * @param fieldName
   * @param value
   * @param selectFields
   */
  public async selectByField(
    fieldName: string,
    value: any,
    selectFields = [],
  ): Promise<any | null> {
    if (!this.isValidField(fieldName)) {
      return null;
    }

    const queryResults = await this.selectWhere({ [fieldName]: value }, selectFields);
    if (queryResults.length === 0) {
      return null;
    }

    return queryResults[0];
  }

  /**
   * select a single entry by primary key id
   *
   * @param id
   * @param selectFields
   * @returns
   */
  public async selectById(id: any, selectFields = []) {
    return this.selectByField(this.getPrimaryKey(), id, selectFields);
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

  public async updateById() {
    
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
    return this.deleteWhere({ id }, forceDelete);
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

  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  public async getEntryById(id: string | number): Promise<MysqlTableEntry> {
    const entry = new MysqlTableEntry(this);
    await entry.fetchById(id);

    return entry;
  }
}
