import { EnabledModules, Module } from "./modules/defines"
import { HttpConfig } from "./modules/http/defines";
import { WSConfig } from "./modules/websockets/defines";

export enum Environment {
  dev = "dev",
  test = "test",
  staging = "staging",
  prod = "prod",
  production = "production", // alias of prod
}

export interface ServerConfig {
  modules: Module[];

  // http sub modules and configuration
  http?: HttpConfig
  websockets?: WSConfig
}

export const SHUTDOWN_FORCE_TIMEOUT = 10000; // 10 secs