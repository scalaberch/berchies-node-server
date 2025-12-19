import { Request, Response, NextFunction } from "express";
// import expressSession, { Session } from "express-session";

export const DEFAULT_PORT = 3000;
export const RATE_LIMIT_GLOBAL = 240;
export const HEALTH_CHECK_RPM = 2;
export const DEFAULT_REDIRECT_URL = "https://www.eyeball.games"

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS" | "PATCH";

export enum HttpRedirectCode {
  permanent = 301,
  temporary = 302,
}

export interface HttpNext extends NextFunction {}

export interface HttpRequest<T = any> extends Request {
  getQuery(key?: string, fallbackValue?: any): any;
  getBody(key?: string, fallbackValue?: any): any;
  getParam(key?: string, fallbackValue?: any): any;

  rawBody?: any;
  body: T
}

export interface HttpResponse extends Response {
  outputSuccess(payload: any, message?: string): void;
  outputCreated(payload: any, message?: string): void;
  outputJson(payload: any, code?: number);
  outputError(message: string, payload?: any, code?: number);
  outputAsCSV(dataset: any, fileName?: string);
  outputDiscordJson(payload: any, responseType?: number, visibleOnlyToUser?: boolean);
  redirectToUrl(url: string);

  jsonOutput: string;
}

export interface HttpConfig {
  corsDomainList: string[],
  requestLimitPerMinute: number
}

export interface ErrorResponse {
  statusCode?: number;
  errors?: Object;
  message?: string;
}

export interface APIJSONOutput {
  error?: Object;
  message: String;
  success: Boolean;
  data: any;
}

export class HttpError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}