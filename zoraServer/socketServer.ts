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

      // 为每个socket订阅Redis消息通道
      io.on('connection', (ws:Socket)=>{
        const socketUtils = new SocketUtils({
          redis,prisma,io,redisExpired
        },ws,users,agent)

        socketUtils.socketAgentOnline()

        socketUtils.socketOnline()

        socketUtils.socketOnSendMessage()

        socketUtils.socketOnAskAi()

        socketUtils.socketUserOffline()

        // 订阅该socket的Redis消息通道
        const channelName = `socket.io#${ws.id}`;
        const subscriber = redis.duplicate();

        subscriber.subscribe(channelName, (err) => {
          if (err) {
            console.error(`订阅Redis频道${channelName}失败:`, err);
            return;
          }

          subscriber.on('message', (channel, message) => {
            if (channel === channelName) {
              try {
                const parsedMessage = JSON.parse(message);
                if (parsedMessage.type === 'offline_messages') {
                  ws.emit('offline_messages', parsedMessage.data);
                }
              } catch (e) {
                console.error('解析Redis消息失败:', e);
              }
            }
          });
        });

        // 当socket断开连接时，取消订阅并清理Redis中的数据
        ws.on('disconnect', async () => {
          await subscriber.unsubscribe(channelName);
          await subscriber.quit();

          // 从Redis中删除该用户的socketId
          for (const [userId, socketId] of users.entries()) {
            if (socketId === ws.id) {
              await redis.del(`user_socket:${userId}`);
              users.delete(userId);
              break;
            }
          }

          // 从Redis中删除该客服的socketId
          for (const [agentId, socketId] of agent.entries()) {
            if (socketId === ws.id) {
              await redis.del(`agent_socket:${agentId}`);
              agent.delete(agentId);
              break;
            }
          }
        });
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
