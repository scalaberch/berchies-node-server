import path from 'path';
import Files, { currentDir } from '@server/lib/files';
import { ServerConfig } from '@server/defines';
import { Server } from '..';
import { Log } from '@server/logs';

export const ModulesFolder = `${currentDir}/server/modules`;
export type Module = 'http' | 'cache' | 'mysql' | 'websockets' | 'stripe';
export type EnabledModules = Module[];

export interface ServerModuleInterface {
  server: Server;
  name: string;
  config: any;

  // Called immediately after loading the module class
  init(): Promise<any | void>;

  // Called after all modules are fully loaded
  start(): Promise<any | void>;

  // Called after all modules are fully loaded
  stop(): Promise<any | void>;
}

/// move stuff below to index.ts

export class ServerModule implements ServerModuleInterface {
  public server: Server;
  public name: string;
  public config: any;

  public constructor(server: Server, name = '') {
    this.server = server;
    this.name = name;

    // find the configuration based on the server config values
    const baseConfig = this.server.config;
    this.config = baseConfig[this.name] ?? {};
  }

  public async init() {}

  public async start(): Promise<any> {}

  public async stop() {}
}

export class ServerModules {
  private server: Server;
  public modules: Record<string, ServerModule>;

  public constructor(server: Server) {
    this.modules = {};
    this.server = server;
  }

  public async addModule(imported: any, moduleName: string): Promise<void> {
    const moduleClass = imported?.default;
    const module: ServerModule = new moduleClass(this.server, moduleName);

    // Add to registry and run initializer
    this.modules[moduleName] = module;
    await this.modules[moduleName].init();
  }

  public isModuleEnabled(moduleName: Module): boolean {
    return this.modules.hasOwnProperty(moduleName);
  }

  public getModule(moduleName: Module): ServerModule | null {
    const module = this.modules[moduleName];
    if (typeof module === 'undefined') {
      return null;
    }
    return module;
  }

  public async loadAll(config: ServerConfig): Promise<void> {
    const folders = Files.getFolders(ModulesFolder);
    if (!folders.length) return;

    const selectedModules = config?.modules;
    if (!selectedModules) return;

    for (const moduleName of selectedModules) {
      if (!folders.includes(moduleName)) {
        console.warn(`Module '${moduleName}' not found in /modules`);
        continue;
      }

      try {
        const entry = path.join(ModulesFolder, moduleName, 'index');
        const imported = await import(entry);
        await this.addModule(imported, moduleName);
      } catch (error) {
        console.error(`Failed to load module '${moduleName}':`, error);
        throw error; // stop server start
      }
    }
  }

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

    // console.log("\n");
  }

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
