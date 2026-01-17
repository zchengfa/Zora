import {redisClient} from "./redisClient.ts";
import {Worker} from "bullmq";
import {logger} from "./logger.ts";
import {WorkerHealth} from "./workerHealth.ts";

const workerHealth = new WorkerHealth({
  connection: redisClient,
  workerName: process.env.LOGGER_WORKER_HEALTH_KEY || 'logger'
})

await workerHealth.registerWorker()

const loggerWorker = new Worker('loggerQueue',async (job)=>{
  const {level,message,...jobObj} = job.data
  switch(level){
    case 'info':
      logger.info(message,jobObj)
      break;
    case 'warn':
      logger.warn(message,jobObj)
      break;
    case 'error':
      logger.error(message,jobObj)
      break;
    case 'debug':
      logger.debug(message,jobObj)
      break;
    default:
      break;
  }
},{
  connection:redisClient,
  concurrency: 5
})


loggerWorker.on('completed',(job) => {
  logger.info('logger worker completed',{meta:{
      taskType: `logger_worker`,
      jobId: job.id,
      jobName: job.name,
    }})
});

loggerWorker.on('failed', (job, err) => {
  logger.error(`logger_worker`,{meta:{
      taskType: `logger_worker`,
      jobId: job?.id,
      jobName: job?.name,
      error:{
        name: err.name,
        message: err.message,
        stack: err.stack,
      }
    }})
});

loggerWorker.on('error', (err) => {
  logger.error('logger worker failed',{meta:{
      taskType: `logger_worker`,
      error:{
        name: err.name,
        message: err.message,
        stack: err.stack,
      }
    }})
})

const loggerWorkerHeartBeatTimer = setInterval(async ()=>{
  await workerHealth.updateWorkerHeartBeat()
},15000)

// 监听进程关闭信号，进行优雅关闭
process.on('SIGINT', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(loggerWorkerHeartBeatTimer)
  await loggerWorker.close()
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(loggerWorkerHeartBeatTimer)
  await loggerWorker.close()
  process.exit(0);
});


