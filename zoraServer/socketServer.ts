import {Server,Socket} from 'socket.io'
import type {Redis} from 'ioredis'
import {PrismaClient} from "@prisma/client";
import * as process from "node:process";
import {SocketUtils} from '../plugins/socketUtils.ts'

export async function startSocketServer({server,redis,prisma}:{server:Server,redis:Redis,prisma:PrismaClient}) {
   const redisExpired = 3600 * 24 * 7
  try{
      const io = new Server(server,{
        cors: {
          origin: [
            ...((process.env.SERVER_ORIGIN as string).split(','))
          ],
        },
        transports: ['websocket','polling']
      })

      //客户socket
      const users = new Map()
      //客服socket
      const agent = new Map()
      io.on('connection', (ws:Socket)=>{
        const socketUtils = new SocketUtils({
          redis,prisma,io,redisExpired
        },ws,users,agent)

        socketUtils.socketAgentOnline()

        socketUtils.socketOnline()

        socketUtils.socketOnSendMessage()

        socketUtils.socketUserOffline()

      })
      return {
        result: true,
        message:'✅ zora socket服务启动成功'
      }
    }
    catch (e){
      return {
        result: false,
        message: '❌ zora socket服务启动失败',
        error: e
      }
    }
}
