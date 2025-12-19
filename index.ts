import _ from "lodash";
import { memoryUsage } from "node:process";
import Modules, { loadAllModules } from "./modules/index";
import { Module, ServerModules } from "./modules/defines";
import { ServerConfig } from "./defines";

import Main from "@src/main";
import Config from "@src/config";
import { initializeLogger, Log } from "./logs"

/**
 * main server application definition
 *
 */
export class Server {
  public config: ServerConfig;
  public modules: ServerModules;
  public timezone: string;
  public isRunningTs: boolean;
  public ready: boolean;

  constructor() {
    this.config = Config;
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.isRunningTs = isRunningInTypeScript();
    this.modules = new ServerModules(this);
    this.ready = false;
  }

  public async start() {
    // initialize logging system
    initializeLogger(this.config)
    Log.system(`\n\n\nInitializing server...`)

    // attach process handlers
    this.attachProcessHandlers();

    // load all modules
    try {
      await this.modules.loadAll(this.config);
    } catch (error) {
      Log.error('Module Load Error: ', error)
      return; // we stop if there are any error/s when loading all modules
    }

    // then run start all modules
    await this.modules.startAll();

    // then find the src/main file and if it exists, run the main function
    Log.info(`\n🟢 Server is ready.\n\n`)
    this.ready = true;
    if (typeof Main === "function") {
      Main(this);
    }
  }

  public async shutdown() {
    if (!this.ready) {
      return Promise.resolve();
    }

    // stop all modules
    await this.modules.stopAll();

    // output it
    this.ready = false;
    return Promise.resolve();
  }

  public getTimezone() {
    return this.timezone;
  }

  public getMemoryUsage() {
    const currentMemoryUsage = memoryUsage();
    return currentMemoryUsage;
  }

  private attachProcessHandlers() {
    const _this = this;

    ["SIGINT", "SIGTERM"].forEach((signal: string) => {
      process.on(signal, async () => {
        Log.warn(`⚠️  Received signal ${signal}.`)
        await _this.shutdown();
        process.exit();
      });
    });

    process.on("exit", async (code) => {
      await _this.shutdown();
      Log.system(`🛑 Node.js process exited with code ${code}`)
    });
  }
}

/**
 * server timezone
 *
 */
export const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * check if running executable is running on typescript or on plain javascript
 *
 * @returns
 */
export const isRunningInTypeScript = () => {
  const args = process.argv;
  const files = args
    .filter((arg) => arg.includes("index"))
    .map((arg) => {
      const split = arg.split("/");
      return split[split.length - 1];
    });

  const indexFiles = _.uniq(files);
  const indexFile = indexFiles.length > 0 ? indexFiles[0] : "";
  const indexFileSplit = indexFile.split(".");
  const ext = indexFileSplit[indexFileSplit.length - 1];
  return ext.toLowerCase() === "ts";
};

// pack up server and export
const server = new Server();
export default server;
