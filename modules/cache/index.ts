import { ServerModule } from '@server/modules/defines';
import { generateUrl } from './cache';
import { createClient, RedisClientType } from 'redis';
import server from '@server/index';
import { RedisSetOptions } from './defines';

export const cache = (): Cache | null => {
  const cacheObject = server.modules.getModule('cache');
  if (cacheObject === null) {
    return null;
  }
  return cacheObject as Cache;
};

export const isCacheActive = () => {
  const _cache = cache();
  if (_cache === null) {
    return false;
  }

  return _cache.isConnected();
}

export default class Cache extends ServerModule {
  public endpoint: string;
  public redis: RedisClientType = null;

  override async init() {
    this.endpoint = generateUrl();
    this.redis = createClient({ url: this.endpoint });
  }

  override async start() {
    try {
      await this.redis.connect();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  override async stop(): Promise<void> {
    // const _cache = getCache();
    // if (isCacheActive()) {
    //   _cache.shutdown();
    // }

    this.redis.destroy();
  }

  /**
   * checks if redis module is active and is connected
   *
   * @returns
   */
  isActive() {
    if (this.redis === null) {
      return false;
    }

    return this.isConnected();
  }

  /**
   * checks if the cache is connected to the redis server
   *
   * @returns
   */
  isConnected() {
    return this.redis.isOpen;
  }

  /**
   * checks if a key exists in cache
   *
   * @param key
   * @returns
   */
  async keyExists(key: string) {
    if (!this.isActive()) {
      return false;
    }

    const exists = await this.redis.exists(key);
    return exists > 0;
  }

  /**
   * get all objects with the given key index
   *
   * @param key
   * @returns
   */
  async getAllObjects(key: string) {
    const objects = [];
    if (!this.isActive()) {
      return objects;
    }

    const keys = await this.redis.keys(`${key}*`);
    for (const key of keys) {
      const data = await this.redis.hGetAll(key);
      objects.push({ id: key, ...data });
    }

    return objects;
  }

  /**
   * gets an item from the cache, given the key
   *
   * @param key
   * @returns
   */
  async get(key: string) {
    if (!this.isActive()) {
      return null;
    }
    return await this.redis.get(key);
  }

  /**
   * sets an item to the cache. this is using the normal SET in redis, so `data` must be a STRING
   *
   * @param key
   * @param data
   * @param options
   * @returns
   */
  async set(key: string, data: string, options: RedisSetOptions = {}) {
    if (!this.isActive()) {
      return null;
    }
    return await this.redis.set(key, data, { ...options });
  }

  /**
   * sets an object to the cache. this is using the HSET in redis, so `data` must be an OBJECT
   *
   * @param key
   * @param data
   */
  async setObject(key: string, data: any = {}) {
    if (!this.isActive()) {
      return null;
    }

    return await this.redis.hSet(key, data);
  }

  /**
   * sets an object expiry in seconds.
   *
   * @param key
   * @param seconds
   * @returns
   */
  async setObjectExpiry(key: string, seconds: number = 60) {
    if (!this.isActive()) {
      return null;
    }

    return await this.redis.expire(key, seconds);
  }

  /**
   * delete a key in the cache
   *
   * @param key
   * @returns
   */
  async del(key: string) {
    if (!this.isActive()) {
      return null;
    }

    return await this.redis.del(key);
  }
}
