import Redis from 'ioredis';
import config from '../config';

// The whole platform must keep working even if Redis is briefly unavailable,
// so every helper below fails soft (logs + returns null/no-op) instead of throwing.
const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  lazyConnect: false,
});

redisClient.on('error', (err) => {
  console.error('[Redis] connection error (continuing without cache):', err.message);
});

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write failure should never break the request flow.
  }
};

export const cacheDel = async (keyOrPattern: string): Promise<void> => {
  try {
    if (keyOrPattern.includes('*')) {
      const keys = await redisClient.keys(keyOrPattern);
      if (keys.length) await redisClient.del(...keys);
    } else {
      await redisClient.del(keyOrPattern);
    }
  } catch {
    // no-op
  }
};

export default redisClient;
