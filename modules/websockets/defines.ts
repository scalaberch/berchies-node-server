import { DEFAULT_PORT } from '../http/defines';
import WebsocketClient, { IncomingMessage, WSMessageIn } from "./client"

export const PORT: number = parseInt(process.env.PORT || '') || DEFAULT_PORT;
export const PING_INTERVAL = 30000;
export const MainSocketsSrc = './src/websockets';
export const BasePath = "/ws";
export const AuthParamJwt = "token"

export type WSAuthMethod = 'jwt' | 'oauth' | 'none';

export interface WSConfig {
  uri?: string;
  authMethod?: WSAuthMethod;
}

export enum MessageTypes { 
  ping = 'ping',
  pong = 'pong',
  refreshAccessToken = 'refresh',
}

export interface WSHandler {
  onConnect(client: WebsocketClient, req: IncomingMessage): any | void;
  onMessage(client: WebsocketClient, data: WSMessageIn): any | void;
  onClose(client: WebsocketClient): any | void;

  onAuthenticated?: Function;
  broadcastToAll?: Function;
}