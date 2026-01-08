import { CACHE_USER, CACHE_HOST, CACHE_PASS, CACHE_PORT } from './defines';

/**
 * auto-generates the redis url
 *
 * @returns {string}
 */
export const generateUrl = (): string => {
  // let credentials = [REDIS_USER, REDIS_PASSWORD].join('@');
  const hasUser = CACHE_USER.length > 0;
  const credentials = `${hasUser ? CACHE_USER : ''}${
    CACHE_PASS.length > 0 ? `${hasUser ? ':' : ''}${CACHE_PASS}` : ''
  }`;
  const url = `redis://${credentials.length > 0 ? `${credentials}@` : ''}${CACHE_HOST}:${CACHE_PORT}`;
  return url;
};
