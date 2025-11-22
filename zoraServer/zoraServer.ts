import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import express from "express"
import cors from 'cors'
import bodyParser from "body-parser"
import { startSocketServer } from "./socketServer.ts"
import { zoraApi } from "./zoraApi.ts";

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
const server = app.listen(8080,()=>{
  console.log("zora服务启动成功，端口：8080")
})

//接口
zoraApi(app)

//启动socket服务
startSocketServer(server)

