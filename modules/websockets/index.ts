import fs from 'fs';
import path from 'path';
import { ServerModule } from '@server/modules/defines';
import { WebSocketServer } from 'ws';
import Log from '@server/logs';
import {
  PORT,
  PING_INTERVAL,
  MainSocketsSrc,
  BasePath,
  WSHandler,
  WSAuthMethod,
  WSConfig,
} from './defines';
import WebsocketClient, { IncomingMessage } from './client';
import { isRunningInTypeScript } from '@server/lib/files';
import { handleOnConnection, handleOnServerClose, startSocketServer } from './sockets';
import { parseCookiesAsync } from '../http/cookies';
import { wrapToHttpRequest } from '../http/utils';
import { NodeEnvironments } from '@server/env';

export class Websockets extends ServerModule {
  public ws: WebSocketServer;
  public wsConfig: any;
  public port: number;
  public intervalHandle: NodeJS.Timeout | null;
  public clients: Record<string, WebsocketClient>;
  public handler: WSHandler;
  public authMethod: WSAuthMethod;
  public autoRefreshJwt: boolean;
  public encryptedMessages: boolean;

  override async onInit() {
    this.port = PORT;
    this.intervalHandle = null;
    this.clients = {};
    this.ws = null;

    this.authMethod = this.config?.authMethod || 'none';
    this.autoRefreshJwt = this.config?.autoRefreshJwtOnExpiry || false;
    this.encryptedMessages = this.config?.encryptedMessages || false;

    this.wsConfig = {
      path: BasePath,
    };

    // initialize handler
    this.loadHandler();
  }

  override async onStart() {
    const parent = this;
    const serverEnv = this.server.environment;
    const nodeEnv = serverEnv.getNodeEnv();
    if (nodeEnv === NodeEnvironments.test) {
      return Promise.resolve(null);
    }

    // setup server
    this.ws = startSocketServer(this.server, this.port, this.wsConfig);

    // setup server on close handler
    this.ws.on('close', () => {
      return handleOnServerClose();
    });

    // setup client connection handler
    this.ws.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
      const request = await wrapToHttpRequest(req);

      // await parseCookiesAsync(req);
      // const cookies = request.cookies;
      // console.log(cookies);

      return await handleOnConnection(parent, socket, request);
    });

    // enable interval
    this.enableInterval();

    // return the value.
    return Promise.resolve(this.ws);
  }

  override async onStop(): Promise<void> {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
    }

    // terminate all connections!
    this.shutdown();
  }

  private enableInterval() {
    const parent = this;

    this.intervalHandle = setInterval(() => {
      // ping all clients
      parent.pingHeartbeatToClients();
    }, PING_INTERVAL);
  }

  private async loadHandler() {
    const srcFile = `${MainSocketsSrc}.${isRunningInTypeScript() ? 'ts' : 'js'}`;

    if (fs.existsSync(srcFile)) {
      const module = await import(path.resolve(srcFile));
      this.handler = module.default ?? module; // support both default and named export
    } else {
      Log.warn('Websocket module not loaded!');
    }
  }

  public getAllClients() {
    return Object.values(this.clients);
  }

  public getClientCount() {
    return this.getAllClients().length;
  }

  /**
   *
   * @returns
   */
  public pingHeartbeatToClients = () => {
    const clients = this.getAllClients();
    if (clients.length === 0) {
      return;
    }

    clients.forEach((client: WebsocketClient) => {
      //   //   // if (ws.isAlive === false) return ws.terminate();
      //   //   //   // ws.isAlive = false;

      client.ping();
    });
  };

  /**
   * handle shutdown
   *
   */
  public shutdown() {
    if (this.ws !== null) {
      this.ws.close(() => {
        Log.info('WebSocket server closed.');
      });

      const clients = this.getAllClients();
      clients.forEach((client: WebsocketClient) => {
        client.socket.close(1001, 'Server shutting down.');
      });
    }
  }
}

export default new Websockets();
