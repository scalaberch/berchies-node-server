import { Request, Response, NextFunction } from 'express';
import { CookieOptions } from 'express';
import { Session } from 'express-session';

export const DEFAULT_PORT = 3000;
export const RATE_LIMIT_GLOBAL = 240;
export const HEALTH_CHECK_RPM = 2;
export const DEFAULT_REDIRECT_URL = 'https://www.eyeball.games';
export const DefaultCookieLife = 7200000;

export type HttpMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';
export type HttpCookieSameSite = boolean | 'none' | 'lax' | 'strict';

export enum HttpRedirectCode {
  permanent = 301,
  temporary = 302,
}

/**
 * Extends Express's NextFunction for middleware chaining.
 */
export interface HttpNext extends NextFunction {}

/**
 * Extends the base Express Request object with additional application-specific properties and helper methods.
 * @template T The expected type of the request body.
 */
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

/**
 * Pagination parameters accepted by list/search endpoints.
 *
 * Use either page-based pagination (`page` + `pageSize`) or offset-based
 * pagination (`offset` + `limit`). Cursor-based pagination can be used via
 * `cursor` + `limit` when supported.
 */
export interface PaginationRequest {
  /** The current page number for pagination. */
  page?: number;
  /** The number of items to return per page. */
  perPage?: number;
  /** A search term to query against specified fields. */
  search?: string;
  /** The database column or field to apply the search term against. */
  searchBy?: string;
  /** The direction to sort the results. Can be 'asc', 'desc', 0 (for asc), or 1 (for desc). */
  sort?: 'asc' | 'desc' | 0 | 1;
  /** The database column or field to sort the results by. */
  sortBy?: string;
  /** The database column or field to apply a specific filter on. */
  filterBy?: string;
  /** The value to use for the filter. */
  filterValue?: string;
}

/**
 * Extends HttpRequest to include common properties for pagination, sorting, searching, and filtering.
 * Often used for list/table-based API endpoints.
 */
export type PaginatedHttpRequest = HttpRequest & PaginationRequest;

/**
 * Extends the base Express Response object with additional application-specific helper methods for sending formatted responses.
 */
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

/**
 * Defines the configuration for the HTTP module.
 */
export interface HttpConfig {
  /** A list of allowed domains for CORS (Cross-Origin Resource Sharing). */
  corsDomainList: string[];
  /** The maximum number of requests allowed per minute for global rate limiting. */
  requestLimitPerMinute?: number;
  /** Flag to enable or disable cookie parsing and handling. */
  enableCookies?: boolean;
}

/**
 * Represents the structure of a standardized error response.
 */
export interface ErrorResponse {
  /** The HTTP status code of the error. */
  statusCode?: number;
  /** An object containing specific error details, often validation errors. */
  errors?: Object;
  /** A general error message. */
  message?: string;
}

/**
 * Defines the standard structure for all JSON API responses.
 */
export interface APIJSONOutput {
  /** An object containing error details, if any. */
  error?: Object;
  /** A descriptive message about the outcome of the request. */
  message: String;
  /** A boolean indicating if the request was successful. */
  success: Boolean;
  /** The data payload of the response. */
  data: any;
}

/**
 * Custom error class for HTTP-related errors.
 * Allows for specifying an HTTP status code and additional details.
 */
export class HttpError extends Error {
  /** The HTTP status code associated with the error. */
  statusCode: number;
  /** Optional additional details or context about the error. */
  details?: any;

  /**
   * Creates an instance of HttpError.
   * @param {string} message - The error message.
   * @param {number} [statusCode=500] - The HTTP status code. Defaults to 500.
   * @param {any} [details] - Additional error details.
   */
  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
