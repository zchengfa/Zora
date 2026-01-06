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
import {logger} from "../plugins/logger.ts";
import {currentFileName} from "../plugins/handleZoraError.ts";

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
webhooks({app,redis,prisma,router})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req,res,next)=> interceptors({res,req,next}))

const server = app.listen(3001,()=>{
  logger.info(`${currentFileName(import.meta.url,true)}zora服务启动成功，端口：3001`)
})

//接口
zoraApi({app,redis,prisma,shopifyApiClientsManager})


//启动socket服务
startSocketServer({redis,prisma,server}).then(res=>{
  logger.info(res)
})
  .catch(e=>{
    logger.error(e)
  })

syncRedis({prisma,redis}).then(res=>{
  logger.info(res)
})
  .catch(e=>{
    logger.error(e)
  })

// 全局捕获未处理的 Promise 异常
process.on('unhandledRejection', (reason, promise) => {
  logger.error('检测到未处理的 Promise 异常', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('检测到未捕获的异常', { error });
  process.exit(1);
});

