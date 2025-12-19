import _ from "lodash";
import { Environment } from "./defines";

type Production = Environment.prod | Environment.production;

/**
 * get all the environment variables
 *
 */
export const env = process.env;

/**
 * some helper variable
 *
 */
export const allowedEnvironments = Object.values(Environment) as string[];

/**
 * Checks if a given string is one of the valid values in the Environment enum.
 * This is a Type Predicate, which tells TypeScript the value's type is narrowed
 * to 'Environment' if the function returns true.
 *
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
    return "";
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
  defaultValue: number | string = ""
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
