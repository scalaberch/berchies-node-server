import { Server } from 'http';
import express, { Express } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { express as useragent } from 'express-useragent';
import {
  overrideSNSHeader,
  AccessLog,
  applyRequestFunctions,
  applyResponseFunctions,
} from './middlewares';
import { ServerModule } from '@server/modules/defines';
import { DEFAULT_PORT, HttpConfig } from '@server/modules/http/defines';
import applyCors from './cors';
import Router from './router';
import Log from '@server/logs';
import ExpressListEndpoints from 'express-list-endpoints';
import { errorHandler } from './utils/handlers';
import { bodyParserJsonVerify, setGlobalRateLimit } from './utils';
import useCookies from './cookies';
import { AppEnvironments, NodeEnvironments } from '@server/env';
import { isLanSingleBranchMode } from '@src/config/deployment';

export const PORT: number = parseInt(process.env.PORT || '') || DEFAULT_PORT;

/**
 * initialize express server
 *
 * @param config
 * @returns
 */
const initializeServer = (config: HttpConfig) => {
  const server: Express = express();
  const enableCookies = config.enableCookies || false;

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
  server.set('trust proxy', true);

  // cookies handling
  if (enableCookies) {
    useCookies(server);
  }

  // set error handling
  server.use(errorHandler);

  // apply middlwares
  server.use(AccessLog);
  server.use(applyRequestFunctions);
  server.use(applyResponseFunctions);

  // apply cors
  applyCors(server, config);

  // setup global rate limiter
  setGlobalRateLimit(server, config);

  // routes(server, httpModules, appModules);
  return server;
};

/**
 * HTTP module
 *
 */
export class Http extends ServerModule {
  public express: Express;
  public httpServer: Server;
  public port: number;

  override async onInit() {
    this.port = PORT;
    this.express = initializeServer(this.config);
  }

  override async onStart() {
    const parent = this;

    // load the routes
    await Router(this.express, [], {});

    // start the server
    return new Promise((resolve, reject) => {
      if (!parent.canListen()) {
        resolve(null);
        return;
      }

      const listenHost = String(process.env.HOST ?? '').trim()
        || (isLanSingleBranchMode() ? '0.0.0.0' : undefined);
      const onListen = (err?: Error) => {
        if (err) {
          return reject(err);
        }

        this.httpServer = _server;
        resolve(_server);

        const hostLabel = listenHost && listenHost !== '0.0.0.0' ? listenHost : 'localhost';
        Log.info(`[http] ✅ HTTP Service is online in: http://${hostLabel}:${this.port}`);
        if (isLanSingleBranchMode() && listenHost === '0.0.0.0') {
          Log.info(`[http] LAN edition listening on all interfaces (0.0.0.0:${this.port})`);
        }
      };

      const _server = listenHost
        ? this.express.listen(this.port, listenHost, onListen)
        : this.express.listen(this.port, onListen);
    });
  }

  override async onStop(): Promise<void> {
    const _this = this;

    return new Promise<void>((resolve, reject) => {
      if (!_this.canListen()) {
        return resolve();
      }

      _this.httpServer.close((err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      });
    });
  }

  getLoadedRoutes() {
    return ExpressListEndpoints(this.httpServer);
  }

  private canListen() {
    const serverEnv = this.server.environment;
    const nodeEnv = serverEnv.getNodeEnv();
    return nodeEnv !== NodeEnvironments.test
  }
}

export default new Http({
  requires: []
});