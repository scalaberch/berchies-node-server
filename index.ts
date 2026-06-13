import { memoryUsage } from 'node:process';
import Modules, { ServerModules } from './modules/index';
import { ServerConfig, serverTimezone, SHUTDOWN_FORCE_TIMEOUT } from './defines';
import { isRunningInTypeScript } from './lib/files';
import { currentDir } from './lib/files';
import ServerEnv, { ServerEnvironment, isProductionApplication as checkProductionApplication } from './env';

import Main from '@src/main';
import Config from '@src/config';
import Log from './logs';
import { Http } from './modules/http';

/**
 * main server application definition
 *
 */
export class Server {
  public environment: ServerEnvironment;
  public config: ServerConfig;
  public modules: ServerModules;
  public timezone: string;
  public isRunningTs: boolean;
  public ready: boolean;
  public cwd: string;

  constructor() {
    this.config = Config;
    this.timezone = serverTimezone;
    this.isRunningTs = isRunningInTypeScript();
    this.modules = Modules; //new ServerModules(this);
    this.ready = false;
    this.cwd = currentDir;

    // load environment variables
    this.environment = ServerEnv;
  }

  /**
   * start application
   *
   * @returns {void}
   */
  public async start() {
    // initialize logging system
    Log.initialize(this.config, this);
    Log.system(`\n\Starting server...`);
    Log.info(`ENV: ${this.environment.getVariable('ENV')}`);
    Log.info(`NODE_ENV: ${this.environment.getVariable('NODE_ENV')}`);
    Log.system('\n');

    if (this.ready) {
      const errorMessage = '[server] Server already running!';
      throw Error(errorMessage);
    }

    // attach process handlers
    this.attachProcessHandlers();

    // load all modules
    await this.modules.initialize(this);

    this.ready = true;
    Log.info(`\n🟢 Server is ready.\n\n`);

    if (typeof Main === 'function') {
      await Main(this);
    }
  }

  /**
   * stop application
   *
   * @returns {void}
   */
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

  /**
   * get server timezone
   *
   * @returns
   */
  public getTimezone() {
    return this.timezone;
  }

  /**
   * get RAM usage
   *
   * @returns
   */
  public getMemoryUsage() {
    const currentMemoryUsage = memoryUsage();
    return currentMemoryUsage;
  }

  /**
   * True when both `ENV` and `NODE_ENV` are production (strict application prod mode).
   * Same logic as `isProductionApplication` exported from `./env`.
   */
  public isProductionApplication(): boolean {
    return checkProductionApplication();
  }

  /**
   * attach node.js process handlers
   *
   * @returns
   */
  private attachProcessHandlers() {
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.once('SIGUSR2', () => this.handleShutdown('SIGUSR2')); // For Nodemon

    process.on('exit', async (code) => {
      // await _this.shutdown();
      Log.system(`👋🛑 Node.js process exited with code ${code}`);
    });
  }

  /**
   * handle shutdown
   *
   * @param signal
   */
  private async handleShutdown(signal: string) {
    Log.system(`⚠️ Received ${signal}. Starting shutdown sequence...`);

    // Set a fail-safe so the process doesn't hang forever
    setTimeout(() => {
      Log.error('🛑🛑🛑 Shutdown timed out! Force exiting.');
      process.exit(1);
    }, SHUTDOWN_FORCE_TIMEOUT);

    try {
      // This is your custom method handling HTTP, WS, MySQL, etc.
      await this.shutdown();
      process.exit(0); // Clean exit
    } catch (err) {
      Log.error('⚠️ Error during shutdownAllModules:', err);
      process.exit(1); // Exit with error
    }
  }

}

// pack up server and export as a singleton
export default new Server();

export { isProductionApplication } from './env';
