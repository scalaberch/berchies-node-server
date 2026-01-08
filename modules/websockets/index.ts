import fs from 'fs';
import path from 'path';
import { ServerModule } from '../defines';
import { WebSocketServer } from 'ws';
import { Log } from '@server/logs';
import { PORT, PING_INTERVAL, MainSocketsSrc, BasePath, WSHandler, WSAuthMethod } from './defines';
import WebsocketClient, { IncomingMessage } from './client';
import { isRunningInTypeScript } from '@server/index';
import { handleOnConnection, handleOnServerClose, startSocketServer } from './sockets';

export default class Websockets extends ServerModule {
  public ws: WebSocketServer;
  public wsConfig: any;
  public port: number;
  public intervalHandle: NodeJS.Timeout | null;
  public clients: Record<string, WebsocketClient>;
  public handler: WSHandler;
  public authMethod: WSAuthMethod;

  override async init() {
    this.port = PORT;
    this.intervalHandle = null;
    this.clients = {};
    this.authMethod = this.config?.authMethod || 'none';

    this.wsConfig = {
      path: BasePath,
    };

    // initialize handler
    this.loadHandler();
  }

  override async start() {
    const parent = this;

    // setup server
    this.ws = startSocketServer(this.server, this.port, this.wsConfig);

    // setup server on close handler
    this.ws.on('close', () => {
      return handleOnServerClose();
    });

    // setup client connection handler
    this.ws.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
      return await handleOnConnection(parent, socket, req);
    });

    // enable interval
    this.enableInterval();

    // return the value.
    return Promise.resolve(this.ws);
  }

  override async stop(): Promise<void> {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
    }

    // terminate all connections!
    this.shutdown();
  }

  private enableInterval() {
    this.intervalHandle = setInterval(() => {}, PING_INTERVAL);
  }

  private async loadHandler() {
    const srcFile = `${MainSocketsSrc}.${isRunningInTypeScript() ? 'ts' : 'js'}`;

    if (fs.existsSync(srcFile)) {
      const module = await import(path.resolve(srcFile));
      this.handler = module.default ?? module; // support both default and named export
    } else {
      Log.warn('Module not loaded!');
    }
  }

  public getAllClients() {
    return Object.values(this.clients);
  }

  public getClientCount() {
    return this.getAllClients().length;
  }

  public pingHeartbeatToClients = () => {
    const clients = this.getAllClients();
    if (clients.length === 0) {
      return;
    }

    clients.forEach((client: WebsocketClient) => {
      //   //   // if (ws.isAlive === false) return ws.terminate();
      //   //   //   // ws.isAlive = false;
      //   client.ping();
    });
  };

  public shutdown() {
    this.ws.close(() => {
      Log.info('WebSocket server closed.');
    });

    const clients = this.getAllClients();
    clients.forEach((client: WebsocketClient) => {
      client.socket.close(1001, 'Server shutting down.');
    });
  }
}
