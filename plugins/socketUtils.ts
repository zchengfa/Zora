import type {Redis} from "ioredis";
import {$Enums, PrismaClient} from "@prisma/client";
import {Server, Socket} from "socket.io";
import {beginLogger} from "./bullTaskQueue.ts";

interface SocketUtilConfigType {
  redis: Redis;
  prisma: PrismaClient;
  io: Server;
  redisExpired: number
}

interface PrismaResultType  {
  userId: bigint | null
  shop: string | null
  id: string
  email: string | null
  sessionId: string | null
  state: string | null
  isOnline: boolean
  scope: string | null
  expires: Date | null
  accessToken: string | null
  firstName: string | null
  lastName: string | null
  accountOwner: boolean
  locale: string | null
  collaborator: boolean | null
  emailVerified: boolean | null
}

interface ConversationType {
  shop: string
  id: string
  customer: string | null
  status: $Enums.ConversationStatus
  createdAt: Date
  updatedAt: Date
}
export class SocketUtils{
  private config: SocketUtilConfigType;
  private ws: Socket;
  private users: Map<string,string>;
  private readonly agent: Map<string,string>;
  private static ioInstance: Server | null = null;
  private static agentMapInstance: Map<string,string> | null = null;
  private static usersMapInstance: Map<string,string> | null = null;

  constructor(config:SocketUtilConfigType,ws:Socket,users:Map<string,string>,agent:Map<string,string>) {
    this.config = config
    this.ws = ws
    this.users = users
    this.agent = agent
    SocketUtils.ioInstance = this.config.io
    SocketUtils.agentMapInstance = this.agent
    SocketUtils.usersMapInstance = this.users
    this.repostMessageAck()
  }

  /**
   * 向所有在线客服发送webhook通知
   * @param webhookType webhook类型 (orders/create, customers/update等)
   * @param data webhook数据
   * @param shop 店铺标识
   */
  public static async sendWebhookNotification({
    webhookType,
    data,
    shop
  }: {
    webhookType: string;
    data: any;
    shop: string;
  }) {
    if (!SocketUtils.ioInstance || !SocketUtils.agentMapInstance) {
      await beginLogger({
        level:'error',
        message:'Socket.IO实例或agent Map未初始化',
        meta:{
          taskType: 'socketUtils_sendWebhookNotification',
          webhookType,
          shop,
        }
      })
      return;
    }

    // 导入通知处理器
    const {NotificationProcessor} = await import("./notificationProcessor.ts");

    // 使用通知处理器生成简洁的通知消息
    const processedNotification = NotificationProcessor.processNotification(webhookType, data, shop);

    if (!processedNotification) {
      await beginLogger({
        level:'warning',
        message:'无法处理该webhook类型的通知',
        meta:{
          taskType: 'socketUtils_sendWebhookNotification',
          webhookType,
          shop,
        }
      })
      return;
    }

    // 通知所有在线客服
    SocketUtils.agentMapInstance.forEach((socketId: string) => {
      SocketUtils.ioInstance!.to(socketId).emit('notification', processedNotification);
    });
  }
  private setConversation = async (conversation:ConversationType,user)=>{
    await this.config.redis.hset(`conversation:${conversation.id}`,{...conversation})
    await this.config.redis.expire(`conversation:${conversation.id}`, this.config.redisExpired)
    this.config.io.to(this.users.get(user.userId) as string).emit('conversation_success',conversation.id)
  }
  private getAckCode = (codeType:number)=>{
    switch(codeType){
      case 10001:
        return 'success'
      case 10002:
        return 'content too long'
      case 10003:
        return 'server error'
      case 10004:
        return 'message delivered'
      case 10005:
        return 'read'
      default:
        break;
    }
  }
  private sendMessageAck = (sender:string,msgId:string,status:'SENT' | 'DELIVERED' | 'FAILED' | 'READ' | 'UNREAD',codeType:number,conversationId:string)=>{
    this.config.io.to(sender).emit('message_ack',{
      type: 'ACK',
      msgId,
      msgStatus:status,
      code: this.getAckCode(codeType),
      timestamp: new Date().toISOString(),
      conversationId
    })
  }
  private repostMessageAck = ()=>{
    this.ws.on('message_delivered',(payload)=>{
      let receiver = ''
      //发送者为客户，并且没有接收者id，说明是用户发给客服的消息回执
      if(payload.senderType === 'CUSTOMER'){
        receiver = this.agent.get(payload.recipientId) as string
      }
      else{
        receiver = this.users.get(payload.recipientId) as string
      }
      this.sendMessageAck(receiver,payload.msgId,payload.msgStatus,10004,payload.conversationId)
    })
  }

  /**
   * 触发离线消息推送任务
   * @param userId 用户ID
   */
  private async triggerOfflineMessagePush(userId: string) {
    try {
      // 检查该用户是否有未送达的离线消息
      let messageCount = await this.config.redis.llen(`offline_messages:${userId}`);
      
      // 如果Redis中没有消息，尝试从Prisma数据库中加载
      if (messageCount === 0) {
        const offlineMessages = await this.config.prisma.offlineMessage.findMany({
          where: {
            recipientId: userId,
            isDelivered: false
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 100 // 最多加载100条消息
        });
        
        if (offlineMessages.length > 0) {
          // 将消息重新加载到Redis
          const redisKey = `offline_messages:${userId}`;
          const messagesToLoad = offlineMessages.map(msg => JSON.stringify({
            id: msg.id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            senderType: msg.senderType,
            recipientId: msg.recipientId,
            recipientType: msg.recipientType,
            contentType: msg.contentType,
            contentBody: msg.contentBody,
            metadata: msg.metadata,
            msgId: msg.msgId,
            createdAt: msg.createdAt.toISOString(),
            isOffline: true
          }));
          
          // 使用pipeline批量加载消息
          const pipeline = this.config.redis.pipeline();
          messagesToLoad.forEach(msg => {
            pipeline.lpush(redisKey, msg);
          });
          pipeline.expire(redisKey, this.config.redisExpired);
          await pipeline.exec();
          
          messageCount = messagesToLoad.length;
          
          await beginLogger({
            level: 'info',
            message: `已从数据库为用户${userId}重新加载${messageCount}条离线消息到Redis`,
            meta: {
              taskType: 'socket_util_reload_offline_messages',
              userId,
              messageCount
            }
          });
        }
      }
      
      if (messageCount === 0) {
        return;
      }
      
      // 添加离线消息推送任务到队列
      const { addOfflineMessageJob } = await import("./bullTaskQueue.ts");
      await addOfflineMessageJob({
        userId: userId,
        messageType: 'system',
        messageContent: {
          type: 'push_offline_messages',
          messageCount: messageCount
        },
        senderId: 'system',
        timestamp: new Date().toISOString(),
        priority: 1 // 设置较高优先级
      });
      
      await beginLogger({
        level: 'info',
        message: `已为用户${userId}创建离线消息推送任务，待推送消息数：${messageCount}`,
        meta: {
          taskType: 'socket_util_trigger_offline_message_push',
          userId,
          messageCount
        }
      });
    } catch (e) {
      await beginLogger({
        level: 'error',
        message: `触发离线消息推送任务出错`,
        meta: {
          taskType: 'socket_util_error',
          error: {
            name: e?.name,
            message: e?.message,
            stack: e?.stack,
          }
        }
      });
    }
  }
  public socketAgentOnline = ()=>{
    //客服连接
    this.ws.on('agent',(info)=>{
      if(info){
        this.agent.set(info.id,this.ws.id)
        beginLogger({
          level: 'info',
          message: `客服${info.name}上线了`,
          meta:{
            taskType: 'socket_util_agent'
          }
        }).then()
      }
    })
  }
  public socketOnline = ()=>{
    //客户在线
    this.ws.on('online',async (payload) => {
      const user = JSON.parse(payload)
      try{
        const redisQuery = await this.config.redis.hget(`session:${user.userId}`, 'email')
        if(!redisQuery){
          const prismaQuery:PrismaResultType  = await this.config.prisma.session.findUnique({
            where:{
              userId: user.userId
            }
          })
          this.users.set(String(prismaQuery.userId),this.ws.id)
          await beginLogger({
            level: 'info',
            message: `客户${prismaQuery.email}上线了`,
            meta:{
              taskType: 'socket_util_online'
            }
          })
        }
        else{
          this.users.set(user.userId,this.ws.id)
          await beginLogger({
            level: 'info',
            message: `客户${redisQuery}上线了`,
            meta:{
              taskType: 'socket_util_online'
            }
          })
        }

        // 触发离线消息推送任务
        await this.triggerOfflineMessagePush(user.userId)
      }
      catch (e) {
        await beginLogger({
          level: 'error',
          message: `客户上线处理出错`,
          meta:{
            taskType: 'socket_util_error',
            error:{
              name: e?.name,
              message: e?.message,
              stack: e?.stack,
            }
          }
        })
      }

      //建立会话
      try{
        //查看是否建立过会话
        const prismaConversation = await this.config.prisma.conversation.findFirst({
          where:{
            shop: user.shop,
            customer: user.userId
          }
        })

        //没建立过，需要建立会话
        if(!prismaConversation){
          const conversation = await this.config.prisma.conversation.create({
            data:{
              customer: user.userId,
              shop: user.shop,
            }
          })
          await this.setConversation(conversation, user)
        }
        else{
          await this.setConversation(prismaConversation, user)
        }
      }
      catch (e) {
        await beginLogger({
          level: 'error',
          message: `会话建立出错`,
          meta:{
            taskType: 'socket_util_error',
            error:{
              name: e?.name,
              message: e?.message,
              stack: e?.stack,
            }
          }
        })
      }
    })
  }
  public socketOnSendMessage = ()=>{
    //消息发送
    this.ws.on('sendMessage',async (data)=>{
      const payload = JSON.parse(data)
      let recipient = undefined,sender = undefined
      try{
        //数据表消息存储
        payload.timestamp = new Date(payload.timestamp).toISOString()
        const saveMessagePrisma = await this.config.prisma.message.create({
          data:{
            ...payload,
            msgStatus: "SENT"
          }
        })
        //判断消息体中的recipientType,若是AGENT，表示是发给客服的，CUSTOMER表示发给客户的
        if(payload.recipientType === 'AGENT'){
          recipient = this.agent.get(payload.recipientId)
          sender = this.users.get(payload.senderId)

        }
        else{
          recipient = this.users.get(payload.recipientId)
          sender = this.agent.get(payload.senderId)
        }
        //接收者不在线
        if(!recipient){
          // 保存离线消息到数据库
          await this.config.prisma.offlineMessage.create({
            data: {
              conversationId: payload.conversationId,
              senderId: payload.senderId,
              senderType: payload.senderType,
              recipientId: payload.recipientId,
              recipientType: payload.recipientType,
              contentType: payload.contentType,
              contentBody: payload.contentBody,
              metadata: payload.metadata || {},
              msgId: payload.msgId,
              isDelivered: false
            }
          })

          const redis_key = payload.recipientId
          await this.config.redis.lpush(`offline_messages:${redis_key}`,JSON.stringify(saveMessagePrisma))
          await this.config.redis.expire(`offline_messages:${redis_key}`,this.config.redisExpired)
          //告诉发送者，服务器接收到消息，消息已发送，但用户不在线
          this.sendMessageAck(sender as string,payload.msgId,'SENT',10001,payload.conversationId)
        }
        else{
          this.config.io.to(recipient).emit('message',payload)
        }

      }
      catch (e) {
        await beginLogger({
          level: 'error',
          message: `消息处理出错`,
          meta:{
            taskType: 'socket_util_error',
            error:{
              name: e?.name,
              message: e?.message,
              stack: e?.stack,
            }
          }
        })
        //服务器出现错误，告诉发送者消息发送失败
        this.sendMessageAck(sender as string,payload.msgId,'FAILED',10003,payload.conversationId)
      }
    })
  }
  public socketUserOffline = ()=>{
    this.ws.on('offline',async ({id}:{id:string})=>{
      //用户下线
      const user = this.users.get(id) || this.agent.get(id)
      if(user){
        await beginLogger({
          level: 'info',
          message: `用户下线`,
          meta:{
            taskType: 'socket_util_offline'
          }
        })
      }
      this.users.delete(id)
      this.agent.delete(id)
    })
  }
  public static manualOffline = (id:string)=>{
    SocketUtils.agentMapInstance!.delete(id)
  }

  /**
   * 获取Socket.IO实例
   */
  public static getIoInstance(): Server | null {
    return SocketUtils.ioInstance;
  }

  /**
   * 获取用户Map实例
   */
  public static getUsersMapInstance(): Map<string,string> | null {
    return SocketUtils.usersMapInstance;
  }

  /**
   * 获取客服Map实例
   */
  public static getAgentMapInstance(): Map<string,string> | null {
    return SocketUtils.agentMapInstance;
  }
}
