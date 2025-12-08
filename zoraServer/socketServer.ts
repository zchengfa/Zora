import {Server} from 'socket.io'
import type {Redis} from 'ioredis'
import {PrismaClient} from "@prisma/client";
import * as process from "node:process";

export async function startSocketServer({server,redis,prisma}:{server:Server,redis:Redis,prisma:PrismaClient}) {
    try{
      const io = new Server(server,{
        cors: {
          origin: [
            ...((process.env.SERVER_ORIGIN as string).split(','))
          ],
        },
        transports: ['websocket','polling']
      })

      const users = new Map()
      io.on('connection', (ws:any)=>{
        ws.emit('test','hello')
        ws.on('online',async (payload) => {
          const user = JSON.parse(payload)
          try{
            const redisQuery = await redis.hget(`session:${user.userId}`, 'email')
            if(!redisQuery){
              const prismaQuery = await prisma.session.findUnique({
                where:{
                  userId: user.userId
                }
              })
              users.set(prismaQuery.email,ws.id)
              console.log(prismaQuery.email + '上线了')
            }
            else{
              users.set(redisQuery,ws.id)
              console.log(redisQuery+'上线了')
            }
          }
          catch (e) {
            console.log('出错了：socketServer.ts')
          }
        })
        ws.on('sendMessage',(payload)=>{
          console.log(payload)
        })

      })

      return '✅ zora socket服务启动成功'
    }
    catch (e){
      return '❌ zora socket服务启动失败：' + e
    }
}
