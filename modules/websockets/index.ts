import express, { Express, application, Router, Request } from "express";
import { ServerModule, ServerModuleInterface } from "../defines";
import { DEFAULT_PORT } from "../http/defines";
import { WebSocketServer } from "ws";

export const PORT: number = parseInt(process.env.PORT || "") || DEFAULT_PORT;

export default class Websockets extends ServerModule {
  public ws: WebSocketServer;
  public wsConfig: any;
  public port: number;

  override async init() {
    this.port = PORT;

    // setup server
    const serverConfig = this.server.config;
    const listedModules = serverConfig.modules;
    const hasHttp = listedModules.indexOf("http") >= 0;
    this.wsConfig = hasHttp ? {} : { port: this.port };
  }

  override async start() {
    /**
     * @todo: make sure that if http is loaded then it will run based on the server express getting out
     */
    // this.ws = new WebSocketServer(this.wsConfig);
  }

  override async stop(): Promise<void> {}
}
