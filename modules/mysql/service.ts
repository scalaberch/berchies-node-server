
// export class EbgMysqlDb {
//   private Pool: Pool | null = null;
//   private Db: Kysely<any> | null = null;
//   private config: EbgMysqlConfig;
//   private listener;

//   constructor(settings: EbgMysqlConfig, config?: any) {
//     const { database, username: user, password, host, port } = settings;

//     try {
//       this.Pool = createPool({
//         host,
//         user,
//         password,
//         database,
//         connectTimeout,
//         // acquireTimeout
//       });

//       this.Db = new Kysely<any>({
//         dialect: new MysqlDialect({ pool: this.Pool }),
//       });
//     } catch (error) {
//       console.error("Error importing database definitions:", error);
//       throw new Error("Failed to import database definitions.");
//     }

//     // Create the listener here if ever it does exist.
//     const enabledListener: boolean = config.hasOwnProperty(
//       "enableBinaryLogListener"
//     )
//       ? config.enableBinaryLogListener
//       : false;

//     if (enabledListener) {
//       this.listener = createListener(this.Pool, settings);
//     }

//     this.config = { ...settings, ...config };
//   }

//   public db() {
//     return this.Db;
//   }

//   public getConfig() {
//     return this.config;
//   }

//   public async start() {}

//   public async shutdown() {
//     if (this.db === null) {
//       return false;
//     }

//     await this.Db.destroy();
//     return true;
//   }

//   public async execute(sql: string, repl?: any[] | Record<string, any>) {
//     const db = this.db();
//     return await executeRawQuery(db, sql, repl);
//   }
// }

