import {Worker} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {beginLogger} from "./bullTaskQueue.ts";
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
  return messages.map(msg => JSON.parse(msg))
}

const removeOfflineMessages = async (userId:string, count:number)=>{
  const key = `${MESSAGE_STORAGE_PREFIX}${userId}`
  await redisClient.ltrim(key, count, -1)
}

const pushMessagesToUser = async (userId:string, messages:any[])=>{
  try {
    // 获取Socket.IO实例和用户Map
    const { SocketUtils } = await import("./socketUtils.ts");
    const io = SocketUtils.getIoInstance();
    const usersMap = SocketUtils.getUsersMapInstance();

    if (!io || !usersMap) {
      await beginLogger({
        level: 'error',
        message: `Socket.IO实例或用户Map未初始化，无法推送离线消息给用户${userId}`,
        meta:{
          taskType: 'push_offline_messages',
          userId,
          messageCount: messages.length
        }
      })
      return;
    }

    // 获取用户的socketId
    const socketId = usersMap.get(userId);

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
      return;
    }

    // 批量推送消息
    const messagePayloads = messages.map(message => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderType: message.senderType,
      recipientId: message.recipientId,
      recipientType: message.recipientType,
      contentType: message.contentType,
      contentBody: message.contentBody,
      metadata: message.metadata,
      msgId: message.msgId,
      timestamp: message.createdAt || new Date().toISOString(),
      isOffline: true // 标记为离线消息
    }));

    // 一次性发送所有消息
    io.to(socketId).emit('offline_messages', {
      messages: messagePayloads,
      totalCount: messagePayloads.length
    });

    // 批量发送消息送达确认
    const ackPayloads = messagePayloads.map(msg => ({
      type: 'ACK',
      msgId: msg.msgId,
      msgStatus: 'DELIVERED',
      code: 'message delivered',
      timestamp: new Date().toISOString(),
      conversationId: msg.conversationId
    }));

    io.to(socketId).emit('message_ack_batch', {
      acks: ackPayloads
    });

    await beginLogger({
      level: 'info',
      message: `成功推送${messages.length}条离线消息给用户${userId}`,
      meta:{
        taskType: 'push_offline_messages',
        userId,
        messageCount: messages.length
      }
    })
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

    await pushMessagesToUser(userId, messages)
    await removeOfflineMessages(userId, batchSize)

    await beginLogger({
      level: 'info',
      message: `成功推送${batchSize}条离线消息给用户${userId}`,
      meta:{
        taskType: 'process_offline_message_job',
        userId,
        batchSize,
        remainingCount: messageCount - batchSize
      }
    })

    if(messageCount > batchSize){
      await job.moveToDelayed(Date.now() + BATCH_DELAY, `继续推送用户${userId}的剩余离线消息`)
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
