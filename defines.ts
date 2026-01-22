import _ from 'lodash'
import { EnabledModules, Module } from './modules/defines';
import { HttpConfig } from './modules/http/defines';
import { WSConfig } from './modules/websockets/defines';
import { Server } from './index';

export enum Environment {
  dev = 'dev',
  test = 'test',
  staging = 'staging',
  prod = 'prod',
  production = 'production', // alias of prod
}

export type MainFunction = (application: Server) => void;

export interface ServerConfig {
  modules: Module[];

  // http sub modules and configuration
  http?: HttpConfig;
  websockets?: WSConfig;
}

export const SHUTDOWN_FORCE_TIMEOUT = 10000; // 10 secs

/**
 * server timezone
 *
 */
export const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;