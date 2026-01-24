import {Worker} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {beginLogger, offlineMessageQueue} from "./bullTaskQueue.ts";
import {WorkerHealth} from "./workerHealth.ts";

const workerHealth = new WorkerHealth({
  connection: redisClient,
  workerName: process.env.OFFLINE_MESSAGE_WORKER_HEALTH_KEY || 'offlineMessage'
})

await workerHealth.registerWorker()

const BATCH_SIZE = 10 // 每次批量推送的消息数量
const BATCH_DELAY = 1000 // 批量推送之间的延迟(毫秒)
const MESSAGE_STORAGE_PREFIX = "offline_messages:" // 离线消息存储前缀

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

const worker = new Worker('offlineMessageQueue',async (job)=>{
  await processOfflineMessageJob(job)
},{
  connection: redisClient,
  concurrency: 5
})

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

const offlineMessageWorkerHeartBeatTimer = setInterval(async ()=>{
  await workerHealth.updateWorkerHeartBeat()
},15000)

// 监听进程关闭信号，进行优雅关闭
process.on('SIGINT', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(offlineMessageWorkerHeartBeatTimer)
  await worker.close()
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(offlineMessageWorkerHeartBeatTimer)
  await worker.close()
  process.exit(0);
});
