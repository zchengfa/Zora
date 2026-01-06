import Redis from "ioredis";
import {currentFileName} from "./handleZoraError.ts";
import {logger} from "./logger.ts";

export const redisClient = new Redis(process.env.REDIS_URL as string,{
  maxRetriesPerRequest: null
});

// 监听连接事件（可选，用于监控和调试）
redisClient.on('connect', () => logger.info(`${currentFileName(import.meta.url,true)}redis连接成功`));
redisClient.on('error', (err) => logger.error(`${currentFileName(import.meta.url,true)}redis连接失败`, err));
