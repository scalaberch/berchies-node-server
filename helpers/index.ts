import IP from 'ip';
import cp from 'child_process';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import Log from '@server/logs';

/**
 *
 * @deprecated
 * @returns
 */
export const getEnv = () => {
  const env = process.env.ENV || 'dev';
  return env;
};

/**
 *
 * @deprecated
 * @returns
 */
export const getEnvTag = () => {
  const env = getEnv();
  switch (env) {
    case 'prod':
    case 'production':
      return '';
    case '':
      return 'dev';
    default:
      return env;
  }
};

/**
 * gets my ip address
 *
 * @returns
 */
export const getMyIPAddress = () => IP.address();

/**
 * Retrieves the Git user name configured for the current repository.
 *
 * @returns The Git user name as a string, or an empty string if not found or an error occurs.
 */
export const getGitUser = () => {
  try {
    // This can fail if not in a git repository.
    return cp.execSync('git config user.name').toString().trim();
  } catch {
    return '';
  }
};

/**
 * Retrieves the server's name based on the operating system.
 * It attempts to use platform-specific methods for a more descriptive name,
 * falling back to `os.hostname()` if specific methods fail or return an empty value.
 *
 * @returns The server's name as a string.
 */
export const getServerName = () => {
  try {
    switch (process.platform) {
      case 'win32':
        return process.env.COMPUTERNAME || os.hostname();
      case 'darwin':
        return cp.execSync('scutil --get ComputerName').toString().trim();
      case 'linux': {
        const prettyname = cp.execSync('uname -n').toString().trim();
        return prettyname || os.hostname();
      }
      default:
        return os.hostname();
    }
  } catch (error: any) {
    // If any of the platform-specific commands fail, fall back to os.hostname().
    // Log the error for debugging purposes, but don't re-throw.
    Log.error(`Failed to get server name using platform-specific command: ${error.message}`);
    return os.hostname();
  }
};

/**
 * Encrypts a given input to a SHA256 hash.
 * The input is stringified before hashing.
 *
 * @param input - The data to encrypt.
 * @returns The SHA256 hash as a hex string.
 */
export const encryptToSha256 = (input: any) => {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
};

/**
 * Pauses execution for a specified amount of time.
 *
 * @param waitTime - The time to wait in milliseconds.
 * @returns A promise that resolves after the specified wait time.
 */
export const sleep = (waitTime: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, waitTime));
};

/**
 * Pauses execution for a random amount of time within a specified range.
 *
 * @param minWaitTime - The minimum time to wait in milliseconds.
 * @param maxWaitTime - The maximum time to wait in milliseconds.
 * @returns A promise that resolves after the random wait time.
 */
export const sleepRandomly = (minWaitTime: number, maxWaitTime: number): Promise<void> => {
  const waitTime = randomNumber(minWaitTime, maxWaitTime);
  return sleep(waitTime);
};

/**
 * A utility function to create a rejected promise with a consistent error object shape.
 *
 * @param msg - The error message.
 * @returns A rejected promise with the error object `{ error: msg }`.
 */
export const promiseReject = (msg: string) => {
  return Promise.reject({ error: msg });
};

/**
 *
 * @deprecated please use server/lib/files.getFiles()
 * @param dir
 * @param files
 * @param except
 * @returns
 */
export const fetchAllFiles = (
  dir: string,
  files: Array<string> = [],
  except: Array<string> = [],
) => {
  try {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        fetchAllFiles(name, files, except);
      } else if (!except.includes(name)) {
        files.push(name);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  return files;
};

/**
 * Creates a perpetual task runner that executes a function at a regular interval.
 *
 * @param doThis - The asynchronous or synchronous function to execute on each tick.
 * @param startImmediately - If true, the task runner starts immediately.
 * @param overrideTickTime - The interval in milliseconds between ticks. Defaults to 100ms.
 * @returns An object with `start` and `stop` methods to control the runner.
 */
export const doThisPerpetually = (
  doThis: () => Promise<any> | any,
  startImmediately: boolean = false,
  overrideTickTime?: number,
) => {
  let processing = false;
  let started = false;
  let handler: NodeJS.Timeout | null = null;
  const tickTime = !isNaN(overrideTickTime) ? overrideTickTime : 100; // tick every 100ms

  // define handler function
  const handlerFunction = async () => {
    // skip condition
    if (processing) {
      return;
    }

    // process.
    processing = true;
    await doThis();
    processing = false;
  };

  // define start function
  const start = () => {
    if (started) {
      return;
    }

    started = true;
    handler = setInterval(handlerFunction, tickTime);
  };

  if (startImmediately) {
    start();
  }

  return {
    handler,
    start,
    stop: () => {
      if (!started) {
        return;
      }
      if (handler) clearInterval(handler);
    },
  };
};

/**
 * pick a random element from array
 *
 * @param array
 * @returns
 */
export const pickRandomFromArray = (array: any[]) => {
  if (array.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

/**
 * helper function to check if value exists in array
 *
 * @param value
 * @param array
 * @returns
 */
export const inArray = (value: any, array: any[]) => array.includes(value);

/**
 *
 * @param condition
 * @returns
 */
export const waitUntil = (conditionFn: () => boolean | Promise<boolean>) => {
  const maxWaitingTime = 30; // 30 seconds wait time
  const intervalWaitTime = 1000; // 1 sec wait after executed.
  let condition = true;

  return new Promise(async (res) => {
    let ticks = 0;
    do {
      condition = await conditionFn();

      if (condition) {
        res(true);
        break;
      }

      ticks++;
      if (ticks > maxWaitingTime) {
        res(false);
        break;
      }

      await sleep(intervalWaitTime);
    } while (!condition);
  });
};

/**
 * checks if string is a valid json string.
 *
 * @deprecated
 * @param jsonString
 */
export const isValidJSON = (jsonString: string) => {
  try {
    let json = JSON.parse(jsonString);
    let validity = json && typeof json === 'object';
    return validity;
  } catch (e) {
    return false;
  }
};

/**
 *
 * @param value
 * @returns
 */
export const isANumber = (value: any) => {
  return !isNaN(Number(value));
};

/**
 *
 * @param num
 * @param fallbackNumber
 * @returns
 */
export const ParseNumber = (num: any, fallbackNumber?: number) => {
  const n = Number(num);
  if (isNaN(n)) {
    return isNaN(fallbackNumber) ? 0 : fallbackNumber;
  }
  return n;
};

/**
 * best used if you delete items from a list based on an input array
 *
 * @param firstArray
 * @param secondArray
 */
export const getMissingItemsOnFirstArrayFromSecondArray = (
  firstArray: Array<any>,
  secondArray: Array<any>,
) => {
  return firstArray.length === 0 ? [] : firstArray.filter((cue) => !secondArray.includes(cue));
};

/**
 *
 * @param number
 * @param maxPlaces
 * @param append
 * @returns
 */
export const decimalToFixedString = (number: number, maxPlaces = 2, append = '') => {
  const fixedNumber = number.toFixed(maxPlaces);
  const formatted = parseFloat(fixedNumber).toString();
  return `${formatted}${append}`;
};

/**
 * generate a random number from min to max
 *
 * @param min
 * @param max
 * @returns
 */
export const randomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * gets a boolean value based on the given probability (1:N or basically 1/N)
 *
 * @param probability
 * @returns
 */
export const chance = (probability: number) => {
  if (probability <= 0) return false;
  if (probability >= 1) return true;

  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
  return random < probability;
};

/**
 * a more secure generator for random numberes
 *
 * @param min
 * @param max
 * @returns
 */
export const secureRandomNumber = (min: number, max: number) => crypto.randomInt(min, max + 1);

/**
 * gets the key from an object given its value.
 *
 * @param obj
 * @param value
 * @returns
 */
export const getKeyByValue = <T extends Record<PropertyKey, PropertyKey>>(
  obj: T,
  value: T[keyof T],
): keyof T | undefined => (Object.keys(obj) as (keyof T)[]).find((key) => obj[key] === value);

export const remotePathExists = async (path: string) => {
  try {
    await axios.get(path, {
      validateStatus: (status) => status >= 200 && status < 300,
    });
    return true;
  } catch {
    return false;
  }
};

export const parseJSON = (jsonString: string, makeFallbackValueNull = true) => {
  let value = makeFallbackValueNull ? null : {};

  try {
    value = JSON.parse(jsonString);
  } catch (error) {
    console.error(`JSON parsing error: `, error);
  }

  return value;
};
