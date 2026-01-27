import _ from 'lodash';
import { Environment } from './defines';

/**
 * These are the defined application environments.
 * These are "configurations" of the application depending on the controlled logical environment
 *
 */
export enum AppEnvironments {
  /**
   * This is your local development environment. Give or take this is on Docker. Duh.
   *
   */
  local = 'local',

  /**
   * This is when we will be running CI/CD
   *
   */
  ci = 'ci',

  /**
   * Staging env.
   *
   */
  staging = 'staging',

  /**
   * QA dev.
   *
   */
  qa = 'qa',

  /**
   * Actual production env
   *
   */
  production = 'production',
}

/**
 * These are defined to be on the NODE_ENV environment variable.
 * These ones should control how the Node.js environment would run like.
 *
 */
export enum NodeEnvironments {
  /**
   * This is the normal environment for dev. Most likely you are in node-ts or in docker in dev mode.
   * Expected to output full logging.
   *
   */
  development = 'development',

  /**
   * This is used when running automated testing like in ci/cd pipelines or if you're running `npm run test`.
   * Expected limited logging.
   *
   */
  test = 'test',

  /**
   * This is used on final production env. Most likely if you are running the production build files.
   * Expected minimum logging.
   *
   */
  production = 'production',
}

/**
 * get all the environment variables that was loaded in process.
 *
 */
export const env = process.env;

/**
 * some helper variable
 *
 * @deprecated
 */
export const allowedEnvironments = Object.values(Environment) as string[];

/**
 * Checks if a given string is one of the valid values in the Environment enum.
 * This is a Type Predicate, which tells TypeScript the value's type is narrowed
 * to 'Environment' if the function returns true.
 *
 * @deprecated
 * @param value
 * @returns
 */
export const isValidEnvironment = (value: string | undefined): value is Environment =>
  allowedEnvironments.includes(value as string);

/**
 * gets the current ENV value
 *
 * @returns
 */
export const getEnv = (): Environment => {
  const defaultValue = Environment.dev;
  const envValue: string = (env.ENV || defaultValue).toLowerCase();

  if (isValidEnvironment(envValue)) {
    return envValue;
  }

  return defaultValue;
};

/**
 * helper function to get the "tag" of a certain project environemtn
 *
 * @returns
 */
export const getEnvTag = () => {
  const env = getEnv();
  if (env === Environment.prod || env === Environment.production) {
    return '';
  }
  return env;
};

/**
 * gets an environment variable from process.env
 *
 * @param variable
 * @param isANumber
 * @param defaultValue
 * @returns
 */
export const getEnvVariable = (
  variable: string,
  isANumber = false,
  defaultValue: number | string = '',
) => {
  const value = _.get(env, variable, defaultValue) as any;
  if (isANumber) {
    return isNaN(value) ? 0 : Number(value);
  }
  return value;
};

/**
 * check if dev environment
 *
 * @returns
 */
export const isDevEnv = () => getEnv() === Environment.dev;

/**
 * check if test environment
 *
 * @returns
 */
export const isTestEnv = () => getEnv() === Environment.test;

/**
 * check if production environment
 *
 * @returns
 */
export const isProductionEnv = () =>
  getEnv() === Environment.production || getEnv() === Environment.prod;

/**
 * alias of isProductionEnv function
 *
 * @returns
 */
export const isProdEnv = isProductionEnv; // just an alias

/**
 * alias of getEnvVariable function
 *
 * @returns
 */
export const getEnvVar = getEnvVariable;

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////

const DefaultAppVariables = ['PROJ_NAME', 'ENV', 'NODE_ENV', 'PORT', 'DOMAIN', 'APP_KEY'];
const RequiredAppVariables = ['APP_KEY', 'PROJ_NAME', 'ENV', 'NODE_ENV'];

export class ServerEnvironment {
  protected env: AppEnvironments;
  protected nodeEnv: NodeEnvironments;
  private variables: Record<string, any> = {};

  constructor() {
    this.variables = process.env;
    this.env = this.getVariable('ENV', AppEnvironments.local, false);
    this.nodeEnv = this.getVariable('NODE_ENV', NodeEnvironments.development, false);

    // throw this if required app variables are not set.
    // throw new Error("Configuration not set!")
  }

  getVariable(key: string, defaultValue: string | number = '', isANumber = false) {
    const value = _.get(this.variables, key, defaultValue) as any;
    if (isANumber) {
      return isNaN(value) ? 0 : Number(value);
    }
    return value;
  }

  /**
   * check if environment variable key exists
   *
   * @param key
   * @returns
   */
  keyExists(key: string) {
    return this.variables.hasOwnProperty(key);
  }

  /**
   * set a environment variable.
   *
   * @param key
   * @param value
   */
  setVariable(key: string, value: string | number) {
    this.variables[key] = value;
  }

  getNodeEnv() {
    return this.nodeEnv;
  }

  getEnv() {
    return this.env;
  }

  isDevEnv() {
    return this.env === AppEnvironments.local && this.nodeEnv === NodeEnvironments.development;
  }

  isLocalTestMode() {
    return this.env === AppEnvironments.local && this.nodeEnv === NodeEnvironments.test;
  }
}

/**
 *
 */
export default new ServerEnvironment();
