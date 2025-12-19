import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

/**
 * generate a random string
 *
 * @param length
 * @returns
 */
export const generateRandomString = (length: number) => {
  if (length <= 0) {
    return "";
  }

  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

/**
 * checks if an email input is a valid input based on some regex
 *
 * @param email
 * @returns
 */
export const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * transform's a name into its possessive form
 *
 * @param name
 * @returns
 */
export const makePossessive = (name: string) => {
  if (!name) return name;
  const lastChar = name.charAt(name.length - 1).toLowerCase();
  return lastChar === "s" ? `${name}'` : `${name}'s`;
};

/**
 * generates a random UUID
 * probably just use crypto.randomUUID() ?
 *
 * @returns
 */
export const generateUUID = () => uuidv4();

/**
 * hides middle content of a string with the padded characters showing
 * (i.e. mystring becomes mys...ing)
 *
 * @param hash
 * @param padLength
 * @returns
 */
export const hideMiddleOfString = (hash: string, padLength = 4) => {
  const strLen = hash.length;

  if (strLen < padLength + 1) {
    return hash;
  }
  if (strLen < padLength * 2 + 1) {
    return `${hash}...`;
  }

  return `${hash.slice(0, padLength)}...${hash.slice(strLen - padLength)}`;
};

/**
 * checks if string is a valid json string.
 *
 * @param jsonString
 */
export const isValidJSONString = (jsonString: string) => {
  if (jsonString.length === 0) {
    return false;
  }

  try {
    let json = JSON.parse(jsonString);
    let validity = json && typeof json === "object";
    return validity;
  } catch (e) {
    return false;
  }
};

/**
 * Generate a url-friendly slug string from an input string
 * (i.e.) Hello World -> hello-world
 *
 * @param str
 * @returns {string}
 */
export const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * converts camel case to snake case
 *
 * @param str
 * @returns
 */
export const camelCaseToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * converts snake case to camel case
 *
 * @param snakeStr
 * @returns
 */
export const snakeCaseToCamelCase = (snakeStr: string) =>
  snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * check if string is a snake case
 *
 * @param str
 * @returns
 */
export const isStringIsSnakeCase = (str: string) => /^[a-z]+(_[a-z]+)*$/.test(str);

/**
 * converts a camel cased string into spaced sentence.
 *
 * @param string
 * @param forceToLowerCase
 * @param appendPeriod
 * @returns
 */
export function camelCaseToSentence(
  string: string,
  forceToLowerCase = false,
  appendPeriod = false
) {
  const result = string.replace(/([A-Z])/g, " $1");
  let sentence = result
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.substring(1))
    .join(" ");

  if (forceToLowerCase) {
    sentence = sentence.toLowerCase();
  }

  if (appendPeriod) {
    sentence += ".";
  }

  return sentence;
}

/**
 * pad a string with zeroes at the start.
 * if `num` is 54 becomes 000054 if `totalLength` is 3
 *
 * @param num
 * @param totalLength
 * @returns
 */
export function padWithZeros(num: number, totalLength: number): string {
  return String(num).padStart(totalLength, "0");
}

/**
 * encodes an input string to base 64
 *
 * @param inputString
 * @returns
 */
export const encodeBase64String = (inputString: string) =>
  Buffer.from(inputString, "utf8").toString("base64");

/**
 * decodes a base 64 string to normal string
 *
 * @param base64String
 * @returns
 */
export const decodeBase64String = (base64String: string) =>
  Buffer.from(base64String, "base64").toString("utf8");

/**
 * checks if a string is a valid url string
 *
 * @param url
 * @returns
 */
export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * formats name components into a full name string
 * 
 * @param firstName 
 * @param lastName 
 * @param middleName 
 * @param forceUpperCase 
 * @returns 
 */
export const formatFullName = (
  firstName: string,
  lastName: string,
  middleName = "",
  forceUpperCase = false
) => {
  const name = [firstName, middleName, lastName]
    .map((str) => str.trim())
    .filter((str) => str.length > 0)
    .join(" ");

  return forceUpperCase ? name.toUpperCase() : name;
};

/**
 * check if string has bad words
 * 
 * @param string
 * @returns
 */
export const stringHasBadWords = (string: string) => false; // hasBadWords(string);

/**
 * capitalizing a string.
 *
 * @param str
 * @returns
 */
export const capitalizeString = (str: string) => {
  if (str.length === 0) {
    return "";
  }
  if (str.length === 1) {
    return str.toUpperCase();
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};