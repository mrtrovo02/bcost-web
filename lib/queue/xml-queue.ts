import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Conexão robusta com Redis baseada na documentação oficial do ioredis
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const xmlQueue = new Queue('xml-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry em caso de falha (essencial para integração SEFAZ)
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
  },
});
