import express, { Express } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { express as useragent } from 'express-useragent';
import listEndpoints from 'express-list-endpoints';
import { ServerModule } from '@server/modules/defines';
import { DEFAULT_PORT, HttpConfig } from '@server/modules/http/defines';
import cors from './cors';
import setupRouter from './router';
import Log from '@server/logs';
import { errorHandler } from './utils/handlers';
import { bodyParserJsonVerify, setGlobalRateLimit } from './utils';
import cookies from './cookies';
import { NodeEnvironments } from '@server/env';
import {
  AccessLog,
  applyRequestFunctions,
  applyResponseFunctions,
  overrideSNSHeader,
} from './middlewares';

export const PORT = parseInt(process.env.PORT || '', 10) || DEFAULT_PORT;

const initializeServer = (config: HttpConfig) => {
  const server = express();
  const enableCookies = config.enableCookies || false;

  server.use(overrideSNSHeader);
  server.use(helmet());
  server.use(bodyParser.urlencoded({ extended: true }));
  server.use(
    bodyParser.json({
      verify: bodyParserJsonVerify,
    }),
  );
  server.use(useragent());
  server.set('trust proxy', true);

  if (enableCookies) {
    cookies(server);
  }

  server.use(errorHandler);
  server.use(AccessLog);
  server.use(applyRequestFunctions);
  server.use(applyResponseFunctions);
  cors(server, config);
  setGlobalRateLimit(server, config);

  return server;
};

export class Http extends ServerModule {
  express: Express;
  httpServer: ReturnType<Express['listen']>;
  port: number;

  override async onInit() {
    this.port = PORT;
    this.express = initializeServer(this.config as HttpConfig);
  }

  override async onStart() {
    const parent = this;
    await setupRouter(this.express, [], {});

    return new Promise((resolve, reject) => {
      if (!parent.canListen()) {
        resolve(null);
        return;
      }

      const _server = this.express.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }
        this.httpServer = _server;
        resolve(_server);
        Log.info(`[http] ✅ HTTP Service is online in: http://localhost:${this.port}`);
      });
    });
  }

  override async onStop() {
    const _this = this;
    return new Promise<void>((resolve, reject) => {
      if (!_this.canListen()) {
        resolve();
        return;
      }
      _this.httpServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  getLoadedRoutes() {
    return listEndpoints(this.httpServer);
  }

  canListen() {
    const serverEnv = this.server.environment;
    const nodeEnv = serverEnv.getNodeEnv();
    return nodeEnv !== NodeEnvironments.test;
  }
}

export default new Http({
  requires: [],
});
