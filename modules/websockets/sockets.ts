import { WebSocket } from 'ws';
import WebSocketClient, { IncomingMessage, WSMessageIn, handleOnMessageClient } from './client';
import { Log } from '@server/logs';
import { Server } from '@server/index';
import Http from '../http';
import { WebSocketServer } from 'ws';
import Websockets from './index';

export const handleOnServerClose = () => {
  // put something here if you want to handle on socker server close
};

export const startSocketServer = (server: Server, port: number, wsConfig = {}) => {
  const loadedModules = server.modules;
  const isHttpEnabled = loadedModules.isModuleEnabled('http');

  // create websocket instance here!
  const serverConfig = isHttpEnabled
    ? { server: (loadedModules.getModule('http') as Http).httpServer }
    : { port };

  const ws = new WebSocketServer({
    ...wsConfig,
    ...serverConfig,
  });

  // output the socket server
  return ws;
};

export const handleOnConnection = async (
  socketModule: Websockets,
  socket: WebSocket,
  req: IncomingMessage,
) => {
  // create socket client
  const ipAddress = req.socket.remoteAddress;
  const client = new WebSocketClient(socket, ipAddress);

  // authenticate
  const isAuthenticated = await client.authenticate(socketModule.authMethod, req);
  if (!isAuthenticated) {
    return client.close();
  }

  // setup initial socket event handlers
  client.init(socketModule, );

  // add custom message handling
  socket.on('message', (data: string) => {
    return handleOnMessageClient(client, data, socketModule);
  });

  // add to client list
  socket.isAlive = true;
  socketModule.clients[client.id] = client;

  // ping if connected.
  if (socketModule.handler?.onConnect) {
    await socketModule.handler.onConnect(client, req);
  }
};

export { WebSocketServer };
