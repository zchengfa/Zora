import dotenv from 'dotenv'
import express from "express"
import cors from 'cors'
import bodyParser from "body-parser"
import prisma from '../app/db.server.ts'
import Redis from 'ioredis'
import {startSocketServer} from "./socketServer.ts"
import {zoraApi} from "./zoraApi.ts";
import {syncRedis} from "../plugins/sync.ts";
import interceptors from "../plugins/interceptors.ts";

dotenv.config({ path: '.env' })

const redis = new Redis()

const app = express()
app.use(cors({
  origin: 'https://raylin-flower.myshopify.com'
}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req,res,next)=> interceptors({res,req,next}))

const server = app.listen(8080,()=>{
  console.log("zora服务启动成功，端口：8080")
})
//接口
zoraApi({app,redis,prisma})

//启动socket服务
startSocketServer(server)

syncRedis({prisma,redis}).then(res=>{
  console.log(res)
})

