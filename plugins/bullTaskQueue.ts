import {Queue} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {logger} from "./logger.ts";

/**
 * shopify队列
 */
export const shopifySyncDataQueue = new Queue('shopifySyncDataQueue',{connection: redisClient});

export const addShopifySyncDataJob = async (jobType:string,shop:string)=>{
  const job = await shopifySyncDataQueue.add('syncShopifyData',{jobType,shop},{
    attempts: 3,
    backoff:{type:'exponential',delay: 2000},
    removeOnComplete: true
  })

  logger.info(`已创建shopify数据同步任务，任务：${job.id}，任务类型：${jobType}`,{
    meta:{
      taskType: 'create_sync_shopify_data_queue',
      task: jobType
    }
  })

  return job.id
}

/**
 * logger队列
 */
export const loggerQueue = new Queue('loggerQueue',{
  connection: redisClient,
  defaultJobOptions:{
    removeOnComplete: 10,
    removeOnFail: 100,
    attempts: 3,
    backoff:{type:'exponential',delay: 2000},
  }
});

export const beginLogger = async ({level,message,meta}:{level:'debug'|'info'|'warn'|'error',message:string,meta:any})=>{
  const loggerWorkerStatus = await redisClient.get(`worker:${process.env.LOGGER_WORKER_HEALTH_KEY || 'logger'}:status`)
  if(loggerWorkerStatus){
    const job = await loggerQueue.add(level,{
        level,
        message,
        timestamp: new Date().toISOString(),
        service: process.env.LOGGER_SERVICE || 'logger_service',
        meta:{
          ...meta,
        }
      }
    )

    return job.id
  }

  logger[level](message,{
    meta:{
      ...meta,
    }
  })
}
