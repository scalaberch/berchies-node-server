import express, { Express, Router, Response, Request, NextFunction } from 'express';
import Files, { currentDir, Path } from '@server/lib/files';
import { rateLimit } from 'express-rate-limit';
import { fetchAllFiles } from '@server/helpers';
import { output, notFoundHandler, tooManyRequestsHandler } from './utils/handlers';
import { getEnvVariable } from '@server/env';
import {
  HttpRedirectCode,
  HttpError,
  HttpRequest,
  HttpResponse,
  HttpNext,
  HEALTH_CHECK_RPM,
} from './defines';

const routesPath = './src/routes/';

/**
 *
 * @returns
 */
export const createRoute = () => express.Router();

/**
 * defines the default route.
 *
 * @param req
 * @param res
 */
export const defaultRoute = (req: HttpRequest, res: HttpResponse) => {
  return output(res, {
    message: `Welcome to ${getEnvVariable('PROJ_NAME', false, 'your backend service.')}`,
  });
};

/**
 * loads the routes found in src/routes
 *
 * @param server
 */
export const loadRoutes = async (server: Express): Promise<string[]> => {
  const loadedRouteBasePaths = [];
  const allowedExts = ['ts', 'js'];
  const routePath = Path.join(routesPath);
  const files = Files.getFiles(routesPath);

  if (files.length === 0) {
    return loadedRouteBasePaths;
  }

  for (const routeFile of files) {
    const relativeFilePath = routeFile.replace(routePath, '');
    if (!Files.isFileExtension(relativeFilePath, allowedExts)) {
      continue;
    }

    const selectedRoutePath = Path.join(currentDir, routePath, relativeFilePath);
    const routeModule = await import(selectedRoutePath);
    if (!isValidRouteModule(routeModule?.default)) {
      continue;
    }

    const routerPath = getRouterBase(relativeFilePath);
    server.use(routerPath, routeModule?.default);
    loadedRouteBasePaths.push(routerPath);
  }

  return loadedRouteBasePaths;
};

export const loadRoutesLegacy = async (server: Express) => {
  // const routesPath = "./src/routes";
  const files: Array<string> = fetchAllFiles(routesPath, [], ['README.md', '.DS_Store']);

  if (files.length === 0) {
    return 0;
  }

  const allowedExts = ['ts', 'js'];
  let hasIndex = false;

  for (const routeFile of files) {
    const relativeFilePath = routeFile.replace(routesPath, '');
    const relativeFile = relativeFilePath.split('.');
    if (relativeFile.length < 2) {
      continue;
    }

    const baseExt = relativeFile[relativeFile.length - 1] ?? '';
    const ext = baseExt.toLowerCase();
    if (allowedExts.indexOf(ext) < 0) {
      continue;
    }

    const path = `${process.cwd()}/src/routes${relativeFilePath}`;
    const routeModule = await import(path);
    if (!isValidRouteModule(routeModule)) {
      continue;
    }

    // Load it to the server.
    const routeFileName = routeFile.split('/').pop()?.split('.')[0] || '';
    const hasIndexPath = routeFileName.toLowerCase() === 'index';
    const routePath = hasIndexPath ? relativeFile[0].replace('index', '') : relativeFile[0];
    // server.use(routePath, routeModule.default);
  }

  return hasIndex ? 2 : 1;
};

/**
 *
 * @param filePath
 * @returns
 */
const getRouterBase = (filePath: string): string => {
  // Normalize slashes and remove any trailing slash
  const normalized = Path.normalize(filePath);

  // Remove file extension
  const ext = Path.extname(normalized); // .ts
  const withoutExt = normalized.slice(0, -ext.length);
  const parts = withoutExt.split(Path.sep); // split into segments

  // Handle index.ts
  if (parts[parts.length - 1] === 'index') {
    parts.pop(); // remove 'index'
  }

  const route = '/' + parts.join('/');

  // Ensure no trailing slash (except root)
  return route === '' ? '/' : route;
};

/**
 * condition check if a module is a valid route/controller module
 *
 * @param importedModule
 * @returns
 */
export const isValidRouteModule = (importedModule: any): importedModule is express.Router => {
  return (
    typeof importedModule === 'function' &&
    typeof importedModule.use === 'function' &&
    Array.isArray(importedModule.stack)
  );

  // console.log(Object.getPrototypeOf(importedModule.default))
  // return Object.getPrototypeOf(importedModule.default) === Router;
};

/**
 * middleware to further filter routing from specific domains
 *
 * @param domains
 * @returns
 */
export const accessRouteFromTheseDomains = (domains: Array<string>) => {
  return (req: HttpRequest, res: HttpResponse, next: HttpNext) => {
    const host = req.get('host');
    if (!domains.includes(host)) {
      return notFoundHandler(req, res, next);
    }
    return next();
  };
};

/**
 *
 * @param router
 * @param prefix
 * @param assigner
 * @param middlewares
 * @returns
 */
export const createGroupRoute = (
  router: express.Router,
  prefix = '/',
  assigner: Function,
  middlewares = [],
) => {
  let subroutes = createRoute();
  if (middlewares.length > 0) {
    subroutes.use(middlewares);
  }

  if (typeof assigner === 'function') {
    subroutes = assigner(subroutes);
  }

  router.use(prefix, subroutes);
  return router;
};

/**
 * sets a route's rate limit (requests per minute)
 *
 * @param reqsPerMinute
 * @returns
 */
export const setRouteRateLimit = (reqsPerMinute: number) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequestsHandler,
    max: reqsPerMinute, // 60 requests per minute
    windowMs: 60 * 1000, // 1 minute.
    validate: {
      trustProxy: false,
    },
  });
};

// default
export default async (server: Express, loadedModules: Array<any>, appModules) => {
  // Add up the health-checker route
  server.get('/health-check', setRouteRateLimit(HEALTH_CHECK_RPM), defaultRoute);

  // // add system routes.
  // if (loadedModules.indexOf("checkpoint") >= 0) {
  //   await Checkpoint(server, appModules);
  // }

  // iterate to all routes found.
  const loadedRoutes = await loadRoutes(server);
  if (loadedRoutes.indexOf('/') < 0) {
    server.get('/', defaultRoute);
  }

  // Last, add up the not found handler.
  server.use(notFoundHandler);
};
