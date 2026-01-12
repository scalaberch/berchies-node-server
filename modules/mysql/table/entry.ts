import MysqlTable from '.';
import { MysqlIdType } from './defines';

export default class MysqlTableEntry {
  private entry: any = {};
  private id: MysqlIdType;
  private table: MysqlTable;

  constructor(table: MysqlTable, id: MysqlIdType = null) {
    this.setTable(table);
    this.setId(id);
  }

  async fetchById(id: MysqlIdType) {
    this.entry = await this.table.selectById(id);
    if (this.entry !== null) {
      this.id = id;
    }

    return this.entry;
  }

  async load() {
  }

  getId() {
    return this.id;
  }

  setId(id: MysqlIdType) {
    this.id = id;
  }

  setTable(table: MysqlTable) {
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

  async update(parameters: any) {
    // await this.table.updateWhere({ })
  }
}
