import dotenv from 'dotenv'
import express from "express"
import cors from 'cors'
import bodyParser from "body-parser"
import {redisClient} from "../plugins/redisClient.ts";
import {prismaClient} from "../plugins/prismaClient.ts";
import {startSocketServer} from "./socketServer.ts"
import {zoraApi} from "./zoraApi.ts";
import {syncRedis} from "../plugins/sync.ts";
import {webhooks} from './webhooks.ts';
import interceptors from "../plugins/interceptors.ts";
import {ShopifyApiClientsManager} from "../plugins/shopifyUtils.ts";
import {beginLogger} from "../plugins/bullTaskQueue.ts";
import {WorkerHealth} from "../plugins/workerHealth.ts";
import {SocketUtils} from "../plugins/socketUtils.ts";

dotenv.config({ path: '.env' })

const redis = redisClient
const prisma = prismaClient
const shopifyApiClientsManager = new ShopifyApiClientsManager({redis,prisma})
const router = express.Router();

const app = express()

//信任代理
app.set("trust proxy", 1);
app.use(cors({
  origin: [
    ...((process.env.SERVER_ORIGIN as string).split(','))
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-shopify-request-key','Authorization', 'X-Requested-With','ngrok-skip-browser-warning']
}));

//监听Shopify Webhooks(需要在使用bodyParser之前执行，因为需要验证hmac，必须将原始body计算hmac)
webhooks({app,redis,prisma,router,shopifyApiClientsManager})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


app.post('/api/agent-offline', (req, res) => {
  SocketUtils.manualOffline(req.body.agent);
  res.status(200).json('success');
});

app.use(async (req,res,next)=> {
  await interceptors({res,req,next})
})

const server = app.listen(3001,async ()=>{
  await beginLogger({
    level: 'info',
    message: 'zora server 服务启动成功',
    meta:{
      taskType: 'zora_server_listen',
      port: 3001
    }
  })
})

//接口
zoraApi({app,redis,prisma,shopifyApiClientsManager})


//启动socket服务
startSocketServer({redis,prisma,server}).then(async (res)=>{
  await beginLogger({
    level:'info',
    message:res.message,
    meta:{
      taskType: 'socket_server_listen'
    }
  })
})
  .catch(async (e)=>{
    await beginLogger({
      level:'error',
      message:e.message,
      meta:{
        taskType: 'socket_server_listen',
        error:{
          name: e.error.name,
          message: e.error.message,
          stack: e.error.stack,
        }
      }
    })
  })

syncRedis({prisma,redis}).then(async (res)=>{
  await beginLogger({
    level:'info',
    message:res.message,
    meta:{
      ...res.meta
    }
  })
})


// 存储健康检查实例，用于后续管理
const workerHealthChecks: Map<string, WorkerHealth> = new Map();

const checkWorkerHealth = async ()=>{
  // 检查logger worker
  const loggerWorkerHealth = new WorkerHealth({
    connection: redis,
    workerName: process.env.LOGGER_WORKER_HEALTH_KEY || 'logger',
    maxCheckAttempts: 5,
    workerHealthCheckDelay: 5000
  })
  workerHealthChecks.set('logger', loggerWorkerHealth);
  loggerWorkerHealth.checkWorkerHealthStatus();

  // 检查shopify worker
  const shopifyWorkerHealth = new WorkerHealth({
    connection: redis,
    workerName: process.env.SHOPIFY_WORKER_HEALTH_KEY || 'shopify',
    maxCheckAttempts: 5,
    workerHealthCheckDelay: 5000
  })
  workerHealthChecks.set('shopify', shopifyWorkerHealth);
  shopifyWorkerHealth.checkWorkerHealthStatus();

  // 检查offlineMessage worker
  const offlineMessageWorkerHealth = new WorkerHealth({
    connection: redis,
    workerName: process.env.OFFLINE_MESSAGE_WORKER_HEALTH_KEY || 'offlineMessage',
    maxCheckAttempts: 5,
    workerHealthCheckDelay: 5000
  })
  workerHealthChecks.set('offlineMessage', offlineMessageWorkerHealth);
  offlineMessageWorkerHealth.checkWorkerHealthStatus();

  await beginLogger({
    level: 'info',
    message: '已启动所有worker健康检查',
    meta:{
      taskType: 'worker_health_check_init',
      workers: Array.from(workerHealthChecks.keys())
    }
  })
}

// 检测worker是否开启
checkWorkerHealth().then();

// 优雅关闭时停止所有健康检查
process.on('SIGTERM', async () => {
  workerHealthChecks.forEach((healthCheck, name) => {
    healthCheck.stopHealthCheck();
    beginLogger({
      level: 'info',
      message: `已停止${name} worker的健康检查`,
      meta:{
        taskType: 'worker_health_check_stop',
        worker: name
      }
    }).then();
  });
});

process.on('SIGINT', async () => {
  workerHealthChecks.forEach((healthCheck, name) => {
    healthCheck.stopHealthCheck();
    beginLogger({
      level: 'info',
      message: `已停止${name} worker的健康检查`,
      meta:{
        taskType: 'worker_health_check_stop',
        worker: name
      }
    }).then();
  });
});
