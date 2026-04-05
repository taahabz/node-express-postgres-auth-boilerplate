import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      lazyConnect: true,
      connectTimeout: 5000,
    })
  : null;

if (redis) {
  redis.on('error', (error: Error) => {
    console.error('Redis connection error:', error.message);
  });
}
