import {Queue} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {logger} from "./logger.ts";

/**
 * shopify队列
 */
export const shopifySyncDataQueue = new Queue('shopifySyncDataQueue',{connection: redisClient});

/**
 * 添加订单发货任务
 * @param data 发货数据
 * @returns 任务ID
 */
export const addOrderFulfillmentJob = async (data: {
  orderId: string;
  carrier?: string;
  objectId:string,
  warehouseAddress?: any;
  notifyCustomer?: boolean;
  parcelTemplateToken: string;
  shop: string;
  customerStaffId?: string | null;
}) => {
  const job = await shopifySyncDataQueue.add('fulfillOrder', {
    ...data,
    timestamp: new Date().toISOString(),
  }, {
    attempts: 3,
    backoff: {type: 'exponential', delay: 2000},
    removeOnComplete: 10,
    removeOnFail: 100,
  });

  logger.info(`已创建订单发货任务，任务：${job.id}，订单ID：${data.orderId}`, {
    meta: {
      taskType: 'create_order_fulfillment_job',
      orderId: data.orderId,
      shop: data.shop,
    }
  });

  return job.id;
}

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

export const beginLogger = async ({level,message,meta}:{level:'debug'|'info'|'warning'|'error',message:string,meta:any})=>{
  const winstonSwitch = process.env.WINSTON_SWITCH

  if(Number(winstonSwitch)){
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
  else{
    const finaConsole = 'FROM WINSTON DEFAULT CONSOLE：' + message
    switch (level) {
      case "error":
        console.error(finaConsole)
        break;
      default:
        console.info(finaConsole)
    }
  }

}

/**
 * 离线消息推送队列
 */
export const messageQueue = new Queue('offlineMessageQueue',{
  connection: redisClient,
  defaultJobOptions:{
    removeOnComplete: 10,
    removeOnFail: 100,
    attempts: 3,
    backoff:{type:'exponential',delay: 2000},
  }
});

/**
 * 添加离线消息推送任务
 * @param data 离线消息数据
 * @returns 任务ID
 */
export const addOfflineMessageJob = async (data:any) => {
  const job = await messageQueue.add('pushOfflineMessage', {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  }, {
    priority: data.priority || 0,
    attempts: 3,
    backoff: {type: 'exponential', delay: 2000},
    removeOnComplete: 10,
    removeOnFail: 100,
  });

  logger.info(`已创建离线消息推送任务，任务：${job.id}，用户：${data.userId}，消息类型：${data.messageType}`, {
    meta: {
      taskType: 'create_offline_message_job',
      userId: data.userId,
      messageType: data.messageType,
    }
  });

  return job.id;
}

/**
 * 添加消息状态更新任务
 * @param data 消息状态数据
 * @returns 任务ID
 */
export const addMessageStatusUpdateJob = async (data: {
  msgId: string;
  conversationId: string;
  msgStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ' | 'UNREAD';
}) => {
  const job = await messageQueue.add('updateMessageStatus', {
    ...data,
    timestamp: new Date().toISOString(),
  }, {
    attempts: 3,
    backoff: {type: 'exponential', delay: 2000},
    removeOnComplete: 10,
    removeOnFail: 100,
  });

  logger.info(`已创建消息状态更新任务，任务：${job.id}，消息ID：${data.msgId}，状态：${data.msgStatus}`, {
    meta: {
      taskType: 'create_message_status_update_job',
      msgId: data.msgId,
      msgStatus: data.msgStatus,
    }
  });

  return job.id;
}

/**
 * 添加商店数据清理任务
 * @param shopDomain 商店域名
 * @returns 任务ID
 */
export const addShopDataCleanupJob = async (shopDomain: string) => {
  const job = await shopifySyncDataQueue.add('cleanupShopData', {
    shopDomain,
    timestamp: new Date().toISOString(),
  }, {
    attempts: 3,
    backoff: {type: 'exponential', delay: 2000},
    removeOnComplete: 10,
    removeOnFail: 100,
  });

  logger.info(`已创建商店数据清理任务，任务：${job.id}，商店：${shopDomain}`, {
    meta: {
      taskType: 'create_shop_data_cleanup_job',
      shopDomain: shopDomain,
    }
  });

  return job.id;
}
