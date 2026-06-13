import IP from 'ip';
import cp from 'child_process';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import Log from '@server/logs';

/**
 * Returns the logical environment name from `process.env.ENV`, defaulting to `'dev'`.
 *
 * @deprecated Prefer a single env/config abstraction for deployment stage.
 * @returns Environment string (e.g. `dev`, `prod`).
 */
export const getEnv = () => {
  const env = process.env.ENV || 'dev';
  return env;
};

/**
 * Maps {@link getEnv} to a short tag suitable for labels or non-production suffixes.
 * Production resolves to an empty string; empty env resolves to `'dev'`.
 *
 * @deprecated Prefer explicit env/config instead of string tags.
 * @returns A tag string, or `''` for production.
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
 * Returns this host’s primary IPv4 address using the `ip` package.
 *
 * @returns The detected IP address string.
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
 * Computes a SHA-256 digest of `JSON.stringify(input)` and returns it as a hex string.
 *
 * @param input - Value to serialize and hash (any JSON-serializable input).
 * @returns Lowercase hex SHA-256 string.
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
 * Returns a rejected promise carrying `{ error: msg }` for a consistent consumer shape.
 *
 * @param msg - Error message string.
 * @returns A promise rejected with `{ error: string }`.
 */
export const promiseReject = (msg: string) => {
  return Promise.reject({ error: msg });
};

/**
 * Recursively collects absolute file paths under `dir`, mutating the `files` accumulator.
 * Skips paths listed in `except`.
 *
 * @deprecated Use `server/lib/files.getFiles()` instead.
 * @param dir - Root directory to scan.
 * @param files - Accumulator array (default fresh `[]`).
 * @param except - Absolute paths to exclude from results.
 * @returns The same `files` array with discovered paths appended.
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
 * @returns Control handle: `handler` (interval id or null), `start()` to begin the interval,
 *   and `stop()` to clear it. Skips a tick if the previous run is still in progress.
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
 * Returns a random element from a non-empty array, or `null` if the array is empty.
 *
 * @param array - Source array.
 * @returns A random element, or `null` when `array.length === 0`.
 */
export const pickRandomFromArray = (array: any[]) => {
  if (array.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

/**
 * Returns whether `value` is included in `array` (same semantics as `Array.prototype.includes`).
 *
 * @param value - Needle.
 * @param array - Haystack.
 * @returns `true` if present.
 */
export const inArray = (value: any, array: any[]) => array.includes(value);

/**
 * Polls `conditionFn` once per second until it returns a truthy result or about 30 seconds elapse.
 *
 * @param conditionFn - Predicate evaluated each tick; may be async.
 * @returns Resolves `true` if the condition became true; `false` if the max wait was exceeded.
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
 * Returns whether `jsonString` parses as JSON to a non-null object (arrays count as objects).
 *
 * @deprecated Prefer `JSON.parse` in try/catch or a dedicated schema validator.
 * @param jsonString - Raw JSON text.
 * @returns `true` if parsing succeeds and the result is an object; otherwise `false`.
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
 * Returns whether `Number(value)` is finite (not `NaN`).
 *
 * @param value - Value to test.
 * @returns `true` if coercible to a valid number.
 */
export const isANumber = (value: any) => {
  return !isNaN(Number(value));
};

/**
 * Parses `num` with `Number()`; on `NaN`, returns `fallbackNumber` if it is a valid number, otherwise `0`.
 *
 * @param num - Input to coerce.
 * @param fallbackNumber - Optional fallback when `Number(num)` is `NaN`.
 * @returns Parsed number or fallback/`0`.
 */
export const ParseNumber = (num: any, fallbackNumber?: number) => {
  const n = Number(num);
  if (isNaN(n)) {
    return isNaN(fallbackNumber) ? 0 : fallbackNumber;
  }
  return n;
};

/**
 * Returns entries present in `firstArray` but not in `secondArray` (set difference: first minus second).
 * Returns `[]` when `firstArray` is empty.
 *
 * @param firstArray - Base list.
 * @param secondArray - List whose elements are excluded from the result.
 * @returns Filtered copy of elements only in `firstArray`.
 */
export const getMissingItemsOnFirstArrayFromSecondArray = (
  firstArray: Array<any>,
  secondArray: Array<any>,
) => {
  return firstArray.length === 0 ? [] : firstArray.filter((cue) => !secondArray.includes(cue));
};

/**
 * Formats a number with `toFixed`, strips trailing zeros via `parseFloat`, then appends `append`.
 *
 * @param number - Numeric value.
 * @param maxPlaces - Decimal places for `toFixed` (default `2`).
 * @param append - Suffix concatenated after the formatted number.
 * @returns Human-readable numeric string with optional suffix.
 */
export const decimalToFixedString = (number: number, maxPlaces = 2, append = '') => {
  const fixedNumber = number.toFixed(maxPlaces);
  const formatted = parseFloat(fixedNumber).toString();
  return `${formatted}${append}`;
};

/**
 * Inclusive random integer in `[min, max]` using `Math.random()` (not cryptographically secure).
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns Random integer between `min` and `max`.
 */
export const randomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Returns `true` with probability `probability` using `crypto.getRandomValues` (uniform in `[0,1)`).
 * Values `<= 0` yield `false`; `>= 1` yield `true`.
 *
 * @param probability - Success probability in `(0, 1)` for non-trivial randomness.
 * @returns Random boolean outcome.
 */
export const chance = (probability: number) => {
  if (probability <= 0) return false;
  if (probability >= 1) return true;

  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
  return random < probability;
};

/**
 * Inclusive random integer in `[min, max]` using `crypto.randomInt` (cryptographically secure).
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns Secure random integer.
 */
export const secureRandomNumber = (min: number, max: number) => crypto.randomInt(min, max + 1);

/**
 * Finds the first key in `obj` whose value strictly equals `value`.
 *
 * @typeParam T - Object type with comparable values.
 * @param obj - Key/value map to search.
 * @param value - Value to match (`===`).
 * @returns The matching key, or `undefined` if none.
 */
export const getKeyByValue = <T extends Record<PropertyKey, PropertyKey>>(
  obj: T,
  value: T[keyof T],
): keyof T | undefined => (Object.keys(obj) as (keyof T)[]).find((key) => obj[key] === value);

/**
 * Performs an HTTP GET to `path` and returns whether the response status is 2xx.
 *
 * @param path - Full URL to request.
 * @returns `true` on success; `false` on network errors or non-2xx status.
 */
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

/**
 * Parses JSON text; on failure logs the error and returns `null` (default) or `{}`.
 *
 * @param jsonString - Raw JSON.
 * @param makeFallbackValueNull - If `true` (default), failed parse yields `null`; otherwise `{}`.
 * @returns Parsed value, or fallback on parse error.
 */
export const parseJSON = (jsonString: string, makeFallbackValueNull = true) => {
  let value = makeFallbackValueNull ? null : {};

  try {
    value = JSON.parse(jsonString);
  } catch (error) {
    console.error(`JSON parsing error: `, error);
  }

  return value;
};

/**
 * Constant-time string comparison of UTF-8 byte sequences. Returns `false` if lengths differ.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` if byte contents are identical and lengths match.
 */
export const timingSafeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};