import path from 'path';
import Files from '@server/lib/files';
import { Module, ServerModule, ModulesFolder } from './defines';
import AppServer, { Server } from '../index';
import { inArray } from '@server/helpers';
import { ServerConfig } from '@server/defines';
import Log from '@server/logs';

export { ModulesFolder };

/**
 * application module handler
 *
 */
export class ServerModules {
  private server: Server;
  public modules: Record<string, ServerModule>;
  private loadedModules: Module[];

  public constructor(server: Server = null) {
    this.modules = {};
    this.server = server;
    this.loadedModules = server === null ? [] : server.config?.modules;
  }

  public getLoadedModules() {
    return this.loadedModules;
  }

  /**
   * initialize all the modules
   *
   * @param server
   */
  public async initialize(server: Server = null) {
    this.server = server;

    try {
      await this.loadAll(server.config);
    } catch (error) {
      Log.error('Module Load Error: ', error, true);
    }

    // then run start all modules
    await this.startAll();
  }

  /**
   * load all modules.
   *
   * @param config
   * @returns
   */
  public async loadAll(config: ServerConfig): Promise<void> {
    const folders = Files.getFolders(ModulesFolder);
    if (!folders.length) return;

    const selectedModules = config?.modules;
    if (!selectedModules) return;

    for (const moduleName of selectedModules) {
      if (!folders.includes(moduleName)) {
        Log.warn(`Module '${moduleName}' not found in /modules`);
        continue;
      }

      try {
        const entry = path.join(ModulesFolder, moduleName, 'index');
        const imported = await import(entry);
        await this.addModule(imported, moduleName);
      } catch (error) {
        Log.error(`Failed to load module '${moduleName}':`, error, true);
      }
    }
  }

  /**
   * add module to the list.
   *
   * @param imported
   * @param moduleName
   */
  public async addModule(imported: any, moduleName: string): Promise<void> {
    const module = imported?.default as ServerModule;
    await module.init(this.server, moduleName);

    // Add to registry and run initializer
    this.modules[moduleName] = module;
  }

  /**
   * check if module is already enabled
   *
   * @param moduleName
   * @returns
   */
  public isModuleEnabled(moduleName: Module): boolean {
    return this.modules.hasOwnProperty(moduleName);
  }

  /**
   * check if module is loaded in the configuration
   *  
   * @param moduleName 
   * @returns 
   */
  public isModuleLoaded(moduleName: Module): boolean {
    return this.loadedModules.includes(moduleName)
  }

  /**
   * get the module if it exists or null if not
   *
   * @param moduleName
   * @returns
   */
  public getModule(moduleName: Module): ServerModule | null {
    const module = this.modules[moduleName];
    if (typeof module === 'undefined') {
      return null;
    }
    return module;
  }

  /**
   * start all modules
   *
   * @returns {void}
   */
  public async startAll() {
    let count = 1;
    const moduleCount = Object.keys(this.modules).length;
    if (moduleCount > 0) {
      Log.system('⏳ Starting modules:');
    }

    for (const name in this.modules) {
      const mod = this.modules[name];
      if (typeof mod.start === 'function') {
        Log.system(`(${count++}/${moduleCount}) Starting ${mod.name}...`);
        await mod.start();
      }
    }
  }

  /**
   * stop all modules
   *
   * @returns {void}
   */
  public async stopAll() {
    // reverse the order of the modules.
    const reversed = Object.fromEntries(Object.entries(this.modules).reverse());

    for (const name in reversed) {
      const mod = this.modules[name];
      if (typeof mod.start === 'function') {
        Log.system(`🛑 Stopping ${mod.name}...`);
        await mod.stop();
      }
    }
  }
}

// output the module
export default new ServerModules();
