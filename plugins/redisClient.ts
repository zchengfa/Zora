import Redis from "ioredis";
import {logger} from "./logger.ts";

export const redisClient = new Redis(process.env.REDIS_URL as string,{
  maxRetriesPerRequest: null
});

// 监听连接事件（可选，用于监控和调试）
redisClient.on('connect', () => {
  logger.info('redis连接成功',{
    meta:{
      taskType: 'redis_listen_event'
    }
  })
});
redisClient.on('error', (error) => {
  logger.error('redis连接失败',{
    meta:{
      taskType:'redis_listen_event',
      error:{
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }
  })
});
