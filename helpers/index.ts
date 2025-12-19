import IP from "ip";
import cp from "child_process";
import os from "os";
import crypto from "crypto";
import fs from "fs";
import axios from "axios";

export const getEnv = () => {
  const env = process.env.ENV || "dev";
  return env;
};

export const getEnvTag = () => {
  const env = getEnv();
  let tag = "";

  if (env === "") {
    tag = "dev";
  } else if (env === "prod" || env === "production") {
    tag = "";
  } else {
    tag = env;
  }

  return `${tag}`;
};

/**
 * gets my ip address
 *
 * @returns
 */
export const getMyIPAddress = () => IP.address();

export const getGitUser = () => {
  const prettyname = ""; // cp.execSync("git config user.name").toString().trim();
  return prettyname;
};

export const getServerName = () => {
  switch (process.platform) {
    case "win32":
      return process.env.COMPUTERNAME;
    case "darwin":
      return cp.execSync("scutil --get ComputerName").toString().trim();
    case "linux":
      // const prettyname = cp.execSync("hostnamectl --pretty").toString().trim();
      const prettyname = cp.execSync("uname -n").toString().trim();
      return prettyname === "" ? os.hostname() : prettyname;
    default:
      return os.hostname();
  }
};

export const encryptToSha256 = (input: any) => {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
};

export const sleep = (waitTime: number) => {
  return new Promise((res) => {
    setTimeout(() => {
      return res(true);
    }, waitTime);
  });
};

export const sleepRandomly = async (minWaitTime: number, maxWaitTime: number) => {
  const waitTime = randomNumber(minWaitTime, maxWaitTime);
  return await sleep(waitTime);
};

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
  except: Array<string> = []
) => {
  const fileList = fs.readdirSync(dir);

  for (const file of fileList) {
    const name = `${dir}/${file}`;

    if (fs.statSync(name).isDirectory()) {
      fetchAllFiles(name, files);
    } else if (!except.includes(name)) {
      files.push(name);
    }
  }

  return files;
};

export const doThisPerpetually = (
  doThis: () => Promise<any> | any,
  startImmediately: boolean = false,
  overrideTickTime?: number
) => {
  let processing = false;
  let started = false;
  let handler: NodeJS.Timeout;
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
      clearInterval(handler);
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
    let validity = json && typeof json === "object";
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
  secondArray: Array<any>
) => {
  return firstArray.length === 0
    ? []
    : firstArray.filter((cue) => !secondArray.includes(cue));
};

/**
 *
 * @param number
 * @param maxPlaces
 * @param append
 * @returns
 */
export const decimalToFixedString = (number: number, maxPlaces = 2, append = "") => {
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
export const secureRandomNumber = (min: number, max: number) =>
  crypto.randomInt(min, max + 1);

/**
 * gets the key from an object given its value.
 *
 * @param obj
 * @param value
 * @returns
 */
export const getKeyByValue = <T extends Record<string, unknown>>(
  obj: T,
  value: T[keyof T]
): keyof T | undefined =>
  (Object.keys(obj) as (keyof T)[]).find((key) => obj[key] === value);

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

/**
 * export default
 *
 */
export default {};
