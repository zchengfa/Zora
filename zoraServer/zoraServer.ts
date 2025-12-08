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
import * as process from "node:process";

dotenv.config({ path: '.env' })

const redis = new Redis(process.env.REDIS_URL as string)
const prisma = new PrismaClient()

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

const server = app.listen(8080,()=>{
  console.log("zora服务启动成功，端口：8080")
})
//接口
zoraApi({app,redis,prisma})

//启动socket服务
startSocketServer({redis,prisma,server}).then(res=>{
  console.log(res)
})
  .catch(e=>{
    console.log(e)
  })

syncRedis({prisma,redis}).then(res=>{
  console.log(res)
})

