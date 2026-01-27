import { CacheConfig } from './defines';

/**
 * auto-generates the redis url
 *
 * @returns {string}
 */
export const generateUrl = (): string => {
  const { host, port, username, password } = CacheConfig;

  let authPart = '';
  if (username && password) {
    authPart = `${username}:${password}@`;
  } else if (username) {
    authPart = `${username}@`;
  } else if (password) {
    // Redis allows password without username, e.g., redis://:password@host:port
    authPart = `:${password}@`;
  }

  return `redis://${authPart}${host}:${port}`;
};

/**
 * 
 * @returns {void}
 */
export const setupTestCache = () => {
  CacheConfig.host = '127.0.0.1';
}