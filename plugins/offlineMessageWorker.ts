import {Worker} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {beginLogger, offlineMessageQueue, messageStatusUpdateQueue} from "./bullTaskQueue.ts";
import {WorkerHealth} from "./workerHealth.ts";
import {PrismaClient} from "@prisma/client";

const workerHealth = new WorkerHealth({
  connection: redisClient,
  workerName: process.env.OFFLINE_MESSAGE_WORKER_HEALTH_KEY || 'offlineMessage'
})

await workerHealth.registerWorker()

const prisma = new PrismaClient();

const BATCH_SIZE = 10 // 每次批量推送的消息数量
const BATCH_DELAY = 1000 // 批量推送之间的延迟(毫秒)
const MESSAGE_STORAGE_PREFIX = "offline_messages:" // 离线消息存储前缀
const PENDING_UPDATE_KEY = "pending_message_status_updates" // 待更新消息的Redis key
const STATUS_UPDATE_BATCH_SIZE = 100 // 每次批量更新的消息数量

const getOfflineMessages = async (userId:string, count:number)=>{
  const key = `${MESSAGE_STORAGE_PREFIX}${userId}`
  const messages = await redisClient.lrange(key, 0, count - 1)
  const parsedMessages = messages.map(msg => JSON.parse(msg))

  // 每批次消息内部按时间升序排序（最早的在前，最新的在后）
  return parsedMessages.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.timestamp).getTime()
    const timeB = new Date(b.createdAt || b.timestamp).getTime()
    return timeA - timeB
  })
}

const pushMessagesToUser = async (userId:string, messages:any[])=>{
  try {
    // 从Redis获取用户的socketId
    const socketId = await redisClient.get(`user_socket:${userId}`);

    if (!socketId) {
      await beginLogger({
        level: 'warning',
        message: `用户${userId}不在线，无法推送离线消息`,
        meta:{
          taskType: 'push_offline_messages',
          userId,
          messageCount: messages.length
        }
      })
      return false;
    }

    // 批量推送消息
    const messagePayloads = messages.map(message => {
      let contentBody = message.contentBody;

      // 如果是产品消息，从Shopify获取完整的产品信息
      if (message.contentType === 'PRODUCT') {
        try {
          const productData = JSON.parse(message.contentBody);
          if (productData && productData.product_id) {
            contentBody = message.contentBody;
          }
        } catch (e) {
          console.error('解析产品消息体失败:', e);
        }
      }

      return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderType: message.senderType,
        recipientId: message.recipientId,
        recipientType: message.recipientType,
        contentType: message.contentType,
        contentBody: contentBody,
        metadata: message.metadata,
        msgId: message.msgId,
        timestamp: message.createdAt || new Date().toISOString(),
        isOffline: true // 标记为离线消息
      };
    });

    // 通过Redis发布消息到Socket.IO
    await redisClient.publish(`socket.io#${socketId}`, JSON.stringify({
      type: 'offline_messages',
      data: {
        messages: messagePayloads,
        totalCount: messagePayloads.length
      }
    }));

    // 将推送的消息ID存储到临时Redis集合中，等待客户端确认
    const pendingAckKey = `pending_offline_ack:${userId}`;
    const msgIds = messagePayloads.map(msg => msg.msgId);
    await redisClient.sadd(pendingAckKey, ...msgIds);
    await redisClient.expire(pendingAckKey, 3600 * 24 * 7); // 7天过期

    await beginLogger({
      level: 'info',
      message: `成功推送${messages.length}条离线消息给用户${userId}，等待客户端确认`,
      meta:{
        taskType: 'push_offline_messages',
        userId,
        messageCount: messages.length,
        msgIds
      }
    })

    return true;
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `推送离线消息给用户${userId}失败: ${error.message}`,
      meta:{
        taskType: 'push_offline_messages',
        userId,
        messageCount: messages.length,
        error: error.message
      }
    })
    throw error;
  }
}

const processOfflineMessageJob = async (job:any)=>{
  const {userId} = job.data

  try {
    const key = `${MESSAGE_STORAGE_PREFIX}${userId}`
    const messageCount = await redisClient.llen(key)

    if(messageCount === 0){
      await beginLogger({
        level: 'info',
        message: `用户${userId}没有待推送的离线消息`,
        meta:{
          taskType: 'process_offline_message_job',
          userId
        }
      })
      return
    }

    const batchSize = Math.min(messageCount, BATCH_SIZE)
    const messages = await getOfflineMessages(userId, batchSize)

    const pushResult = await pushMessagesToUser(userId, messages)

    // 只有推送成功后才记录日志，但不立即删除消息
    // 等待客户端确认后再删除
    if(pushResult){
      await beginLogger({
        level: 'info',
        message: `成功推送${batchSize}条离线消息给用户${userId}，等待客户端确认`,
        meta:{
          taskType: 'process_offline_message_job',
          userId,
          batchSize,
          remainingCount: messageCount - batchSize
        }
      })

      // 如果还有剩余消息，添加新的延迟任务而不是使用moveToDelayed
      // 这样可以避免Lock mismatch错误
      if(messageCount > batchSize){
        await offlineMessageQueue.add('pushOfflineMessage', {
          userId,
          messageType: 'system'
        }, {
          delay: BATCH_DELAY,
          jobId: `offline_msg_${userId}_${Date.now()}`,
          attempts: 3
        })

        await beginLogger({
          level: 'info',
          message: `已创建延迟任务继续推送用户${userId}的剩余${messageCount - batchSize}条离线消息`,
          meta:{
            taskType: 'process_offline_message_job',
            userId,
            remainingCount: messageCount - batchSize
          }
        })
      }
    }
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `处理用户${userId}的离线消息推送任务失败: ${error.message}`,
      meta:{
        taskType: 'process_offline_message_job',
        userId,
        error: error.message
      }
    })
    throw error
  }
}

/**
 * 处理消息状态更新任务
 */
const processMessageStatusUpdateJob = async (job: any) => {
  const {msgId, conversationId, msgStatus} = job.data;

  try {
    // 将消息更新任务添加到待更新集合
    await redisClient.sadd(PENDING_UPDATE_KEY, JSON.stringify({
      msgId,
      conversationId,
      msgStatus,
      timestamp: new Date().toISOString()
    }));

    await beginLogger({
      level: 'info',
      message: `消息状态更新任务已添加到待更新集合`,
      meta: {
        taskType: 'process_message_status_update_job',
        msgId,
        conversationId,
        msgStatus
      }
    });

    // 检查是否达到批量更新阈值
    const pendingCount = await redisClient.scard(PENDING_UPDATE_KEY);

    if (pendingCount >= STATUS_UPDATE_BATCH_SIZE) {
      // 达到批量更新阈值，触发批量更新
      await batchUpdateMessageStatus();
    }
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `处理消息状态更新任务失败: ${error.message}`,
      meta: {
        taskType: 'process_message_status_update_job',
        msgId,
        conversationId,
        msgStatus,
        error: error.message
      }
    });
    throw error;
  }
};

/**
 * 批量更新消息状态
 */
const batchUpdateMessageStatus = async () => {
  try {
    // 从Redis获取所有待更新的消息
    const pendingUpdates = await redisClient.smembers(PENDING_UPDATE_KEY);

    if (pendingUpdates.length === 0) {
      return;
    }

    // 解析待更新的消息
    const updates = pendingUpdates.map(item => {
      try {
        return JSON.parse(item);
      } catch (e) {
        console.error('解析消息更新数据失败:', e);
        return null;
      }
    }).filter(Boolean);

    // 按消息状态分组
    const updatesByStatus = new Map<string, Array<{msgId: string, conversationId: string}>>();
    updates.forEach(update => {
      if (!updatesByStatus.has(update.msgStatus)) {
        updatesByStatus.set(update.msgStatus, []);
      }
      updatesByStatus.get(update.msgStatus)!.push({
        msgId: update.msgId,
        conversationId: update.conversationId
      });
    });

    // 批量更新数据库
    for (const [status, items] of updatesByStatus.entries()) {
      await prisma.message.updateMany({
        where: {
          OR: items.map(item => ({
            msgId: item.msgId,
            conversationId: item.conversationId
          }))
        },
        data: {
          msgStatus: status as any
        }
      });

      await beginLogger({
        level: 'info',
        message: `批量更新了${items.length}条消息的状态为${status}`,
        meta: {
          taskType: 'batch_update_message_status',
          status,
          count: items.length
        }
      });
    }

    // 清空待更新集合
    await redisClient.del(PENDING_UPDATE_KEY);

    await beginLogger({
      level: 'info',
      message: `批量更新消息状态完成，共更新${updates.length}条消息`,
      meta: {
        taskType: 'batch_update_message_status',
        totalUpdates: updates.length
      }
    });
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `批量更新消息状态失败: ${error.message}`,
      meta: {
        taskType: 'batch_update_message_status',
        error: error.message
      }
    });
    throw error;
  }
};

const worker = new Worker('offlineMessageQueue',async (job)=>{
  await processOfflineMessageJob(job)
},{
  connection: redisClient,
  concurrency: 5
})

// 创建消息状态更新的worker
const messageStatusUpdateWorker = new Worker('messageStatusUpdateQueue', async (job) => {
  await processMessageStatusUpdateJob(job);
}, {
  connection: redisClient,
  concurrency: 10
});

// 定时批量更新消息状态
const batchUpdateTimer = setInterval(async () => {
  try {
    const pendingCount = await redisClient.scard(PENDING_UPDATE_KEY);
    if (pendingCount > 0) {
      await batchUpdateMessageStatus();
    }
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `定时批量更新消息状态失败: ${error.message}`,
      meta: {
        taskType: 'scheduled_batch_update_message_status',
        error: error.message
      }
    });
  }
}, BATCH_DELAY);

worker.on('completed', async (job) => {
  await beginLogger({
    level: 'info',
    message: `offline message worker completed`,
    meta:{
      taskType: `offline_message_worker`,
      jobId: job.id,
      taskState: 'completed',
    }
  })
});

worker.on('failed', async (job, err) => {
  await beginLogger({
    level: 'error',
    message: `offline message worker failed`,
    meta:{
      taskType: `offline_message_worker`,
      jobId: job?.id,
      taskState: 'failed',
      error:{
        name: err.name,
        message: err.message,
        stack: err.stack,
      }
    }
  })
});

worker.on('error', async (err) => {
  await beginLogger({
    level: 'error',
    message: `offline message worker failed`,
    meta:{
      taskType: `offline_message_worker`,
      taskState: 'error',
      error:{
        name: err.name,
        message: err.message,
        stack: err.stack,
      }
    }
  })
});

// 消息状态更新worker事件监听
messageStatusUpdateWorker.on('completed', async (job) => {
  await beginLogger({
    level: 'info',
    message: `message status update worker completed`,
    meta: {
      taskType: 'message_status_update_worker',
      jobId: job.id,
      taskState: 'completed'
    }
  });
});

messageStatusUpdateWorker.on('failed', async (job, err) => {
  await beginLogger({
    level: 'error',
    message: `message status update worker failed`,
    meta: {
      taskType: 'message_status_update_worker',
      jobId: job?.id,
      taskState: 'failed',
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    }
  });
});

messageStatusUpdateWorker.on('error', async (err) => {
  await beginLogger({
    level: 'error',
    message: `message status update worker error`,
    meta: {
      taskType: 'message_status_update_worker',
      taskState: 'error',
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    }
  });
});

const offlineMessageWorkerHeartBeatTimer = setInterval(async ()=>{
  await workerHealth.updateWorkerHeartBeat()
},15000)

// 监听进程关闭信号，进行优雅关闭
process.on('SIGINT', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(offlineMessageWorkerHeartBeatTimer)
  clearInterval(batchUpdateTimer)
  await worker.close()
  await messageStatusUpdateWorker.close()
  await prisma.$disconnect()
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(offlineMessageWorkerHeartBeatTimer)
  clearInterval(batchUpdateTimer)
  await worker.close()
  await messageStatusUpdateWorker.close()
  await prisma.$disconnect()
  process.exit(0);
});
