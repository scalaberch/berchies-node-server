import { getEnvVariable } from '@server/env';

export const CACHE_HOST = getEnvVariable('REDIS_HOST', false, '127.0.0.1') as string;
export const CACHE_USER = getEnvVariable('REDIS_USER', false, '');
export const CACHE_PASS = getEnvVariable('REDIS_PASSWORD', false, '') as string;
export const CACHE_PORT = getEnvVariable('REDIS_PORT', true, 6379) as number;

export const LOCK_TIME = 120000; // 2 minutes
export const LOCK_PREFIX = `${getEnvVariable('PROJ_NAME')}-cachelock:`;

export interface RedisSetOptions {
  EX?: number; // the specified expire time in seconds
  PX?: number; // the specified expire time in milliseconds
  EXAT?: number; // the specified Unix time at which the key will expire, in seconds
  PXAT?: number; // the specified Unix time at which the key will expire, in milliseconds
  NX?: boolean; // write the data only if the key does not already exist
  XX?: boolean; // write the data only if the key already exists
  KEEPTTL?: boolean; // retain the TTL associated with the key
  GET?: boolean; // return the old string stored at key, or "undefined" if key did not exist
}
