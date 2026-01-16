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

dotenv.config({ path: '.env' })

const redis = redisClient
const prisma = prismaClient
const shopifyApiClientsManager = new ShopifyApiClientsManager({redis,prisma})
const router = express.Router();

const app = express()
app.use(cors({
  origin: [
    ...((process.env.SERVER_ORIGIN as string).split(','))
  ],
}))

//信任代理
app.set("trust proxy", 1);


//监听Shopify Webhooks(需要在使用bodyParser之前执行，因为需要验证hmac，必须将原始body计算hmac)
webhooks({app,redis,prisma,router,shopifyApiClientsManager})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

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


const checkWorkerHealth = ()=>{
  const loggerWorkerHealth = new WorkerHealth({
    connection: redis,
    workerName: process.env.LOGGER_WORKER_HEALTH_KEY || 'logger'
  })
  //logger worker检测
  loggerWorkerHealth.checkWorkerHealthStatus()

  const shopifyWorkerHealth = new WorkerHealth({
    connection: redis,
    workerName: process.env.SHOPIFY_WORKER_HEALTH_KEY || 'shopify'
  })
  //shopify worker检测
  shopifyWorkerHealth.checkWorkerHealthStatus()

}
//检测worker是否开启
checkWorkerHealth()
