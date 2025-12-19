import { EnabledModules, Module } from "./modules/defines"
import { HttpConfig } from "./modules/http/defines";

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
}