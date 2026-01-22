import { generateUUID } from '@server/lib/strings';
import { WebSocketServer, WebSocket } from 'ws';
import { WSAuthMethod } from './defines';
import { IncomingMessage } from 'http';
import WebSocketAuth, { setupJwtTimeout } from './auth';
import Log from '@server/logs';
import { Websockets } from './index';
import { HttpRequest } from '../http/defines';

export enum WSClientStatus {
  'normal' = 1000,
  'policyViolation' = 1008,
  'serverError' = 1011,

  // custom client status
}

export interface WSMessageIn {
  type: string;
  payload: any;
}

export interface WSMessageOut {
  response: string;
  data: any;
  message: string;
}

export default class WebsocketClient {
  public id: string;
  public socket: WebSocket;
  public module: Websockets;

  public user: any;
  public isAlive: boolean;
  public metadata: any;
  public ipAddress;
  public authData;

  constructor(module: Websockets, socket: WebSocket, ipAddress = '::1') {
    this.id = generateUUID();
    this.module = module;
    this.socket = socket;
    this.isAlive = false;
    this.metadata = {};
    this.ipAddress = ipAddress;
    this.authData = {};
  }

  public init(socketModule: Websockets) {
    const parent = this;

    // add the on close handler for now
    this.socket.on('close', async () => {
      if (socketModule.handler?.onClose) {
        await socketModule.handler.onClose(parent);
      }
    });

    // handle pong response
    this.socket.on('pong', () => {
      parent.setAlive(true);
    });

    // add error handler
    this.socket.on('error', (error: Error) => {
      Log.error(error.message, error);
    });
  }

  public getReadyState() {
    return this.socket.readyState;
  }

  public isOpen() {
    const readyState = this.getReadyState();
    return readyState === WebSocket.OPEN;
  }

  public send(data: Partial<WSMessageOut>) {
    return this.sendMessage(data);
  }

  private sendMessage(data: any = null) {
    // check if message is empty
    if (data === null) {
      return false;
    }
    // check if socket client is open
    if (!this.isOpen()) {
      return false;
    }

    // prepare message
    const stringData = JSON.stringify(data);
    if (this.module.encryptedMessages) {
      // @todo: encrypt string data
    }

    // then send it
    this.socket.send(stringData);
    return true;
  }

  public ping() {
    if (this.isOpen()) {
      this.socket.ping();
    }
  }

  public close(forceTerminate = false) {
    console.log(`called close!`);

    if (forceTerminate) {
      this.socket.terminate();
      return;
    }

    this.socket.close();
  }

  public setUser(user: any) {
    this.user = user;
  }

  public setAlive(alive: boolean) {
    this.isAlive = alive;
  }

  public async authenticate(authMethod: WSAuthMethod, req: HttpRequest) {
    switch (authMethod) {
      case 'jwt':
        const { valid, message, error, errorType, data } = await WebSocketAuth.jwt(req);
        if (!valid) {
          this.send({ response: 'AuthError', message: message, data: { error, errorType } });
          return false;
        }

        // set the data to the client so that they can handle it.
        this.authData = data;

        // then handle timeout notification to the socket
        this.metadata.jwtTimeout = setupJwtTimeout(this, data, req);

        return true;
      default:
        // automatically authenticate the socket.
        return true;
    }
  }
}

export { IncomingMessage };
