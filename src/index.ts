import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { redis } from './config/redis.js';
import { prisma } from './prisma.js';

const app = createApp();

const PORT = Number(env.PORT);

const server = app.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
  console.log(`📚 Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Closing HTTP server...`);
  
  server.close(async () => {
    console.log('HTTP server closed.');

    if (redis) {
      await redis.quit();
      console.log('Redis connection closed.');
    }
    
    await prisma.$disconnect();
    console.log('Database connection closed.');
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
