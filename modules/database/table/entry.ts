import DbTable from '.';
import { DbIdType, MysqlIdType } from './defines';

export default class DbTableEntry {
  private entry: any = {};
  private id: DbIdType;
  private table: DbTable;

  constructor(table: DbTable, id: DbIdType = null) {
    this.setTable(table);
    this.setId(id);
  }

  async fetchById(id: DbIdType) {
    this.entry = await this.table.selectById(id);
    if (this.entry !== null) {
      this.id = id;
    }

    return this.entry;
  }

  async load() {}

  getId() {
    return this.id;
  }

  setId(id: DbIdType) {
    this.id = id;
  }

  setTable(table: DbTable) {
    this.table = table;
  }

  toObject() {
    return this.entry;
  }

  toArray() {
    return Object.values(this.entry);
  }

  async doesIdExists() {
    return false;
  }

  async delete(forceDelete = false) {
    const deleteResult = await this.table.deleteById(this.id, forceDelete);
    this.entry = {};
    return deleteResult.deletedRows > 0;
  }

  async update(_parameters: any) {
    // await this.table.updateWhere({ })
  }
}

/** @deprecated Use DbTableEntry */
export { DbTableEntry as MysqlTableEntry };
