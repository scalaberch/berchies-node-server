import { HttpRequest, HttpConfig, RATE_LIMIT_GLOBAL } from '../defines';
import express, { Express } from 'express';
import { setRouteRateLimit } from '../router';
import { IncomingMessage } from 'http';
import { parseCookiesAsync } from '../cookies';

/**
 * get a request's ip address.
 *
 * @param req
 */
export const getRequestIPAddress = (req: HttpRequest) => {
  let ips =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    req.ip ||
    '';

  return ips;
};

/**
 * copy raw body to something else
 *
 * @param req
 * @param res
 * @param buf
 */
export const bodyParserJsonVerify = (req: any, res, buf: any) => {
  req.rawBody = buf; // save raw buffer for signature check
};

/**
 * Set a global rate limit to the service.
 *
 * @param server
 */
export const setGlobalRateLimit = async (server: Express, config: HttpConfig) => {
  const rpm = config?.requestLimitPerMinute ?? RATE_LIMIT_GLOBAL;
  const rateLimitConfig = setRouteRateLimit(rpm);
  server.use(rateLimitConfig);
};

/**
 *
 * @param rawReq
 * @returns
 */
export const wrapToHttpRequest = async (rawReq: IncomingMessage): Promise<HttpRequest> => {
  // We use a dummy express app to grab the official prototype
  const app = express();
  const req = rawReq as HttpRequest;

  // Link the Express Request prototype so methods like req.get() exist
  Object.setPrototypeOf(req, app.request);

  // Link the App instance (Express methods rely on this)
  req.app = app;

  // cookies parsing
  await parseCookiesAsync(req);

  // return
  return req;
};
