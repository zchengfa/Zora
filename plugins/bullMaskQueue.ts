import {Queue} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {currentFileName} from "./handleZoraError.ts";
import {logger} from "./logger.ts";

export const shopifySyncDataQueue = new Queue('shopifySyncDataQueue',{connection: redisClient});

export const addShopifySyncDataJob = async (jobType:string,shop:string)=>{
  const job = await shopifySyncDataQueue.add('syncShopifyData',{jobType,shop},{
    attempts: 3,
    backoff:{type:'exponential',delay: 2000},
    removeOnComplete: true
  })

  logger.info(`${currentFileName(import.meta.url,true)}已创建shopify数据同步任务，任务：${job.id}，任务类型：${jobType}`)

  return job.id
}
