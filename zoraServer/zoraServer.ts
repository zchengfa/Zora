import dotenv from 'dotenv'
import express from "express"
import cors from 'cors'
import bodyParser from "body-parser"
import {PrismaClient} from "@prisma/client"
import Redis from 'ioredis'
import {startSocketServer} from "./socketServer.ts"
import {zoraApi} from "./zoraApi.ts";
import {syncRedis} from "../plugins/sync.ts";
import interceptors from "../plugins/interceptors.ts";
import PrismaSeed from "../prisma/prismaSeed.ts";
import {ShopifyApiClient} from "../plugins/shopifyUtils.ts";

dotenv.config({ path: '.env' })

const redis = new Redis(process.env.REDIS_URL as string)
const prisma = new PrismaClient()
const shopifyApiClients = new Map()

const app = express()
app.use(cors({
  origin: [
    ...((process.env.SERVER_ORIGIN as string).split(','))
  ],
}))

//信任代理
app.set("trust proxy", 1);

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req,res,next)=> interceptors({res,req,next}))

const server = app.listen(3001,()=>{
  console.log("zora服务启动成功，端口：3001")
})

app.post('/shopifyApiClientInit',(req, res)=>{
  const {shop,accessToken} = req.body
  const shopifyApiClient = new ShopifyApiClient({shop,accessToken})
  shopifyApiClients.set(shop,shopifyApiClient)
  res.send({result:true,message:`${shop}的shopifyApiClient初始化完成`})
  console.log(`${shop}的shopifyApiClient初始化完成`)
})
//接口
zoraApi({app,redis,prisma,shopifyApiClients})

//启动socket服务
startSocketServer({redis,prisma,server}).then(res=>{
  console.log(res)
})
  .catch(e=>{
    console.log(e)
  })

// PrismaSeed(prisma).then(res=>{
//   console.log(res)
// })
//   .catch(e=>{
//     console.log(e)
//   })

syncRedis({prisma,redis}).then(res=>{
  console.log(res)
})
  .catch(e=>{
    console.log(e)
  })

