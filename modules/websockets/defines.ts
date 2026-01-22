import { DEFAULT_PORT } from '../http/defines';
import WebsocketClient, { WSMessageIn } from "./client"
import { IncomingMessage } from 'http';

export const PORT = Number(process.env.PORT) || DEFAULT_PORT;
export const MainSocketsSrc = './src/websockets';
export const BasePath = "/ws";
export const AuthParamJwt = "token"

export const PING_INTERVAL = 30000;
export const AUTH_EXPIRE_OFFSET = 5; // 5 seconds before the expiry time, the socket *will* drop.

export type WSAuthMethod = 'jwt' | 'oauth' | 'none';

export interface WSConfig {
  uri?: string;
  authMethod?: WSAuthMethod;
  encryptedMessages?: boolean;
  autoRefreshJwtOnExpiry?: boolean;
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
  onInterval?(): any | void;

  onAuthenticated?: Function;
  broadcastToAll?: Function;
}

export interface WSRequest extends IncomingMessage {
  getCookie(): string;
}

export interface WSResponse {
  
}

export {
  IncomingMessage
}