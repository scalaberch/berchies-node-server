import { Server } from 'http';
import express, { Express } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { express as useragent } from 'express-useragent';
import { overrideSNSHeader, AccessLog } from './middlewares';
import { ServerModule } from '@server/modules/defines';
import { DEFAULT_PORT, RATE_LIMIT_GLOBAL, HttpConfig } from '@server/modules/http/defines';
import applyCors from './cors';
import Router, { setRouteRateLimit } from './router';
import { Log } from '@server/logs';

export const PORT: number = parseInt(process.env.PORT || '') || DEFAULT_PORT;

/**
 * Set a global rate limit to the service.
 *
 * @param server
 */
const setGlobalRateLimit = async (server: Express, config: HttpConfig) => {
  const rpm = config?.requestLimitPerMinute ?? RATE_LIMIT_GLOBAL;
  const rateLimitConfig = setRouteRateLimit(rpm);
  server.use(rateLimitConfig);
};

/**
 *
 * @param req
 * @param res
 * @param buf
 */
const bodyParserJsonVerify = (req: any, res, buf) => {
  req.rawBody = buf; // save raw buffer for signature check
};

/**
 *
 * @param config
 * @returns
 */
const initializeServer = (config: HttpConfig) => {
  const server: Express = express();

  // Override SNS headers
  // This is used for some services to be allowed to access data.
  server.use(overrideSNSHeader);

  // Basic server setup.
  server.use(helmet() as express.RequestHandler);
  server.use(bodyParser.urlencoded({ extended: true }));
  server.use(
    bodyParser.json({
      verify: bodyParserJsonVerify,
    }),
  );
  server.use(useragent());

  // apply middlwares
  server.use(AccessLog);

  // apply cors
  applyCors(server, config);

  // setup global rate limiter
  setGlobalRateLimit(server, config);

  // routes(server, httpModules, appModules);

  return server;
};

/**
 *
 */
export default class Http extends ServerModule {
  public express: Express;
  public httpServer: Server;
  public port: number;

  override async init() {
    this.port = PORT;
    this.express = initializeServer(this.config);
  }

  override async start() {
    // load the routes
    await Router(this.express, [], {});

    // start the server
    return new Promise((resolve, reject) => {
      const _server = this.express.listen(this.port, (err) => {
        if (err) {
          return reject(err);
        }

        this.httpServer = _server;
        resolve(_server);

        Log.info(` ✅ HTTP Service is online in: http://localhost:${this.port}`);
      });
    });
  }

  override async stop(): Promise<void> {
    const _this = this;

    return new Promise<void>((resolve, reject) => {
      _this.httpServer.close((err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }
}
