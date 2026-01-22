import { Request, Response, NextFunction } from 'express';
import { CookieOptions } from 'express';
import expressSession, { Session } from 'express-session';

export const DEFAULT_PORT = 3000;
export const RATE_LIMIT_GLOBAL = 240;
export const HEALTH_CHECK_RPM = 2;
export const DEFAULT_REDIRECT_URL = 'https://www.eyeball.games';
export const DefaultCookieLife = 7200000;

export type HttpMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';
export type HttpCookieSameSite = boolean | 'none' | 'lax' | 'strict'

export enum HttpRedirectCode {
  permanent = 301,
  temporary = 302,
}

export interface HttpNext extends NextFunction {}

export interface HttpRequest<T = any> extends Request {
  removeIds?: Array<string | number>;
  // pageQuery: EBGRequestPageQuery;
  // jwt?: EBGJwtObject;
  // getJWTData(): ImmutableJWTObject | CognitoJWTObject | null;
  getImmutableData(): any;
  // getCognitoData(): EBGCognitoObject | null;
  getJWTString(): string;
  useragent?: any;

  getQuery(key?: string, fallbackValue?: any): any;
  getBody(key?: string, fallbackValue?: any): any;
  getParam(key?: string, fallbackValue?: any): any;
  getCookie(key?: string): string;

  getBodyFromKeys(keys: Array<string>, forcePrefillValue?: boolean): any;
  getModelPayloadFromBody(model: any, includePrimaryKey?: boolean): any;

  access?: Array<any>;
  session?: Session;
  rawBody?: any;
  body: T;

  metadata?: any;
}

export interface HttpResponse extends Response {
  outputSuccess(payload: any, message?: string): void;
  outputCreated(payload: any, message?: string): void;
  outputJson(payload: any, code?: number);
  outputError(message: string, payload?: any, code?: number);
  outputAsCSV(dataset: any, fileName?: string);
  outputDiscordJson(payload: any, responseType?: number, visibleOnlyToUser?: boolean);

  /**
   * redirects to another url and sends a 302 code
   *
   * @param url
   */
  redirectToUrl(url: string);

  /**
   * sets something to cookies!
   * 
   * @param name - the cookie name
   * @param value - the cookie value
   * @param path - default is /
   * @param maxAge - how long will the cookie exist in milliseconds
   * @param sameSite - Persistent enough for navigation
   * @param secure - Only sent over HTTPS
   * @param httpOnly - true to prevents JS access (XSS protection)
   * @param options 
   */
  setCookie(
    name: string,
    value: any,
    path?: string,
    maxAge?: number,
    sameSite?: HttpCookieSameSite,
    secure?: boolean,
    httpOnly?: boolean,
    options?: CookieOptions,
  );

  jsonOutput: string;
}

export interface HttpConfig {
  corsDomainList: string[];
  requestLimitPerMinute?: number;
  enableCookies?: boolean;
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


