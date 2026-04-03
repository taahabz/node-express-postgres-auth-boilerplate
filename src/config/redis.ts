import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: true,
      lazyConnect: false,
    })
  : null;

if (redis) {
  redis.on('error', (error: Error) => {
    console.error('Redis connection error:', error.message);
  });
}
