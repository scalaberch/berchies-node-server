import path from 'path';
import { ServerConfig } from '@server/defines';
import { Server } from '@server/.';
import Log from '@server/logs';

/** Compiled modules live next to this file (dist/server/modules in production). */
export const ModulesFolder = path.resolve(__dirname);
export type Module = 'http' | 'cache' | 'mysql' | 'websockets' | 'stripe' | 'cron' | 'pdf';
export type EnabledModules = Module[];

export interface ServerModuleSettings {
  requires?: Module[],
  name?: string
}

export abstract class ServerModule {
  public server: Server;
  public name: string;
  public config: any;
  public ready: boolean;
  protected requires: Module[];

  constructor(settings: ServerModuleSettings = {}) {
    this.ready = false;
    this.config = {};
    this.name = settings?.name || '';
    this.requires = settings.requires;
  }

  /**
   * Called immediately after loading the module class
   * 
   * @param server 
   * @param name 
   * @returns
   */
  async init(server: Server, name: string): Promise<any | void> {
    this.name = name;
    this.server = server;

    // set the configuration
    const baseConfig = this.server.config;
    this.config = baseConfig[this.name] ?? {};

    // run on execute first
    await this.onInit(this.config);
  }

  /**
   * Child module implements the method.
   * 
   */
  protected abstract onInit(config: any): Promise<void>;

  /**
   * Called after all modules are fully loaded
   * 
   * @returns
   */
  async start(): Promise<any | void> {

    // run on start method.
    await this.onStart();

    // set as ready
    this.ready = true;
  }

  /**
   * Child module implements the method.
   * 
   */
  protected abstract onStart(): Promise<any>;

  /**
   * Called when server shuts down.
   * 
   * @returns
   */
  async stop(): Promise<any | void> {
    await this.onStop();
    this.ready = false;
  }

  /**
   * Child module implements the method.
   * 
   */
  protected abstract onStop(): Promise<any>;

  /**
   * set the module name
   *
   * @param name
   */
  public async setName(name: string) {
    this.name = name;
  }

  /**
   * set the server
   *
   * @param server
   */
  public async setServer(server: Server) {
    this.server = server;
  }
}

export default {};
