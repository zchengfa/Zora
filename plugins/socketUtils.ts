import type {Redis} from "ioredis";
import {$Enums, PrismaClient} from "@prisma/client";
import {Server, Socket} from "socket.io";
import {addMessageStatusUpdateJob, beginLogger,addOfflineMessageJob} from "./bullTaskQueue.ts";
// 导入AI相关模块
import { chatWithAI } from './openAI.ts';

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
    this.ws.on('message_delivered', async (payload)=>{
      let receiver = ''
      //发送者为客户，并且没有接收者id，说明是用户发给客服的消息回执
      if(payload.senderType === 'CUSTOMER'){
        receiver = this.agent.get(payload.recipientId) as string
      }
      else{
        receiver = this.users.get(payload.recipientId) as string
      }
      // 将消息状态更新任务加入队列，异步批量更新
      try {
        await addMessageStatusUpdateJob({
          msgId: payload.msgId,
          conversationId: payload.conversationId,
          msgStatus: payload.msgStatus
        });
      } catch (error) {
        await beginLogger({
          level: 'error',
          message: `添加消息状态更新任务失败`,
          meta: {
            taskType: 'message_delivered',
            msgId: payload.msgId,
            error: {
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            }
          }
        });
      }

      this.sendMessageAck(receiver,payload.msgId,payload.msgStatus,10004,payload.conversationId)
    })

    // 处理离线消息确认回执
    this.ws.on('offline_message_ack', async (payload) => {
      // 在try块外部声明变量，确保在catch块中可以访问
      let userId = null;
      let isAgent = false;

      try {
        const { msgIds } = payload;
        if (!msgIds || !Array.isArray(msgIds) || msgIds.length === 0) {
          await beginLogger({
            level: 'warning',
            message: `收到无效的离线消息确认回执`,
            meta: {
              taskType: 'offline_message_ack',
              payload
            }
          });
          return;
        }

        // 获取当前用户ID或客服ID
        // 先检查是否是客服
        for (const [uid, socketId] of this.agent.entries()) {
          if (socketId === this.ws.id) {
            userId = uid;
            isAgent = true;
            break;
          }
        }

        // 如果不是客服，再检查是否是用户
        if (!userId) {
          for (const [uid, socketId] of this.users.entries()) {
            if (socketId === this.ws.id) {
              userId = uid;
              isAgent = false;
              break;
            }
          }
        }

        if (!userId) {
          await beginLogger({
            level: 'warning',
            message: `无法找到对应的用户ID或客服ID`,
            meta: {
              taskType: 'offline_message_ack',
              socketId: this.ws.id
            }
          });
          return;
        }

        // 从待确认集合中移除已确认的消息ID
        const pendingAckKey = `pending_offline_ack:${userId}`;
        const removedCount = await this.config.redis.srem(pendingAckKey, ...msgIds);

        // 从离线消息列表中删除已确认的消息
        const offlineMessagesKey = `offline_messages:${userId}`;
        const allMessages = await this.config.redis.lrange(offlineMessagesKey, 0, -1);

        // 找出需要删除的消息
        const messagesToRemove = [];
        const dbMessageIds = []; // 存储数据库中的消息ID
        for (const msgStr of allMessages) {
          try {
            const msg = JSON.parse(msgStr);
            if (msgIds.includes(msg.msgId)) {
              messagesToRemove.push(msgStr);
              // 如果消息有数据库ID，添加到待删除列表
              if (msg.msgId) {
                dbMessageIds.push(msg.msgId);
              }
            }
          } catch (e) {
            console.error('解析离线消息失败:', e);
          }
        }

        // 批量删除Redis中的已确认消息
        if (messagesToRemove.length > 0) {
          const pipeline = this.config.redis.pipeline();
          for (const msgStr of messagesToRemove) {
            pipeline.lrem(offlineMessagesKey, 1, msgStr);
          }
          await pipeline.exec();
        }
        // 批量删除数据库中的离线消息
        if (dbMessageIds.length > 0) {
          const offlineMsgResult = await this.config.prisma.offlineMessage.deleteMany({
            where: {
              msgId: {
                in: dbMessageIds
              }
            }
          });
          await beginLogger({
            level: 'info',
            message: `已从数据库删除${offlineMsgResult.count}条离线消息`,
            meta: {
              taskType: 'offline_message_ack',
              userId,
              dbMessageIds,
              userType: isAgent ? 'AGENT' : 'CUSTOMER'
            }
          });
        }

        await beginLogger({
          level: 'info',
          message: `收到离线消息确认回执，${isAgent ? '客服' : '用户'}${userId}确认了${removedCount}条消息`,
          meta: {
            taskType: 'offline_message_ack',
            userId,
            msgIds,
            removedCount,
            userType: isAgent ? 'AGENT' : 'CUSTOMER'
          }
        });
      } catch (e) {
        await beginLogger({
          level: 'error',
          message: `处理离线消息确认回执失败`,
          meta: {
            taskType: 'offline_message_ack',
            error: {
              name: e?.name,
              message: e?.message,
              stack: e?.stack
            }
          }
        });
      }
    });

    // 处理消息已读请求
    this.ws.on('mark_messages_as_read', async (payload) => {
      console.log('收到mark_messages_as_read:', payload);
      try {
        const { msgId, msgStatus, conversationId, senderType } = payload;

        if (!msgId || !msgStatus || !conversationId) {
          await beginLogger({
            level: 'warning',
            message: `收到无效的消息已读回执`,
            meta: {
              taskType: 'mark_messages_as_read',
              payload
            }
          });
          return;
        }

        // 获取当前消息的时间戳
        const currentMessage = await this.config.prisma.message.findFirst({
          where: { msgId: msgId },
          select: { timestamp: true, senderId: true, senderType: true }
        });
        if (!currentMessage) {
          await beginLogger({
            level: 'warning',
            message: `未找到消息记录`,
            meta: {
              taskType: 'mark_messages_as_read',
              msgId
            }
          });
          return;
        }

        // 在更新消息状态之前，先查询待更新的消息ID
        const messagesToUpdate = await this.config.prisma.message.findMany({
          where: {
            conversationId: conversationId,
            senderId: currentMessage.senderId,
            senderType: currentMessage.senderType,
            msgStatus:{
              in: ['DELIVERED', 'SENT']
            },
            timestamp: {
              lte: currentMessage.timestamp
            }
          },
          select: {
            id: true,
            msgId: true
          }
        });

        // 更新数据库中消息状态，包括当前消息及之前的所有未读消息
        await this.config.prisma.message.updateMany({
          where: {
            conversationId: conversationId,
            senderId: currentMessage.senderId,
            senderType: currentMessage.senderType,
            msgStatus:{
              in: ['DELIVERED', 'SENT']
            },
            timestamp: {
              lte: currentMessage.timestamp
            }
          },
          data: { msgStatus }
        });

        // 更新完消息状态后，向发送者和接收者都发送回执，确保双方消息状态同步
        if (msgStatus === 'READ' && messagesToUpdate.length > 0) {
          const msgIds = messagesToUpdate.map(msg => msg.msgId);

          // 获取会话信息
          const conversation = await this.config.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { customer: true }
          });

          // 获取客服信息
          const chatListItem = await this.config.prisma.chatListItem.findUnique({
            where: { conversationId: conversationId },
            select: { agentId: true }
          });

          if (conversation && chatListItem?.agentId) {
            // 获取客户和客服的socket ID
            const customerSocketId = this.users.get(conversation.customer as string);
            const agentSocketId = this.agent.get(chatListItem.agentId);

            // 准备已读回执数据
            const readReceipt = {
              msgId: msgIds,
              msgStatus: 'READ',
              conversationId,
              senderType: currentMessage.senderType
            };

            // 向客户发送已读回执
            if (customerSocketId) {
              this.config.io.to(customerSocketId).emit('messages_batch_read', readReceipt);

              await beginLogger({
                level: 'info',
                message: `已向客户发送消息已读回执`,
                meta: {
                  taskType: 'messages_batch_read',
                  conversationId,
                  msgId,
                  customerSocketId
                }
              });
            }

            // 向客服发送已读回执
            if (agentSocketId) {
              this.config.io.to(agentSocketId).emit('messages_batch_read', readReceipt);

              await beginLogger({
                level: 'info',
                message: `已向客服发送消息已读回执`,
                meta: {
                  taskType: 'messages_batch_read',
                  conversationId,
                  msgId,
                  agentSocketId
                }
              });
            }
          }
        }
      } catch (e) {
        await beginLogger({
          level: 'error',
          message: `处理消息已读回执失败`,
          meta: {
            taskType: 'message_delivered',
            error: {
              name: e?.name,
              message: e?.message,
              stack: e?.stack
            }
          }
        });
      }
    });

    // 处理获取消息状态请求
    this.ws.on('get_message_status', async (payload) => {
      try {
        const { conversationId, msgIds } = payload;

        if (!conversationId) {
          await beginLogger({
            level: 'warning',
            message: `收到无效的获取消息状态请求`,
            meta: {
              taskType: 'get_message_status',
              payload
            }
          });
          return;
        }

        // 如果提供了msgIds，只查询这些消息的状态；否则查询该会话的所有消息
        const whereCondition: any = {
          conversationId: conversationId
        };

        if (msgIds && Array.isArray(msgIds) && msgIds.length > 0) {
          whereCondition.msgId = {
            in: msgIds
          };
        }

        // 查询消息及其状态
        const messages = await this.config.prisma.message.findMany({
          where: whereCondition,
          select: {
            msgId: true,
            msgStatus: true,
            conversationId: true,
            senderId: true,
            senderType: true,
            recipientId: true,
            recipientType: true,
            contentType: true,
            contentBody: true,
            timestamp: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        });

        // 发送消息状态更新给请求的客户端
        this.ws.emit('message_status_update', {
          conversationId: conversationId,
          messages: messages
        });

        await beginLogger({
          level: 'info',
          message: `已发送消息状态更新`,
          meta: {
            taskType: 'get_message_status',
            conversationId,
            messageCount: messages.length,
            requestedMsgIds: msgIds
          }
        });
      } catch (e) {
        await beginLogger({
          level: 'error',
          message: `处理获取消息状态请求失败`,
          meta: {
            taskType: 'get_message_status',
            error: {
              name: e?.name,
              message: e?.message,
              stack: e?.stack
            }
          }
        });
      }
    });

    // 处理获取未读消息数请求
    this.ws.on('get_unread_messages', async (payload) => {
      try {
        const { userId, shop } = payload;

        if (!userId) {
          await beginLogger({
            level: 'warning',
            message: `收到无效的获取未读消息请求`,
            meta: {
              taskType: 'get_unread_messages',
              payload
            }
          });
          return;
        }

        // 统计该用户的未读消息数（状态为SENT或DELIVERED且发送者为AGENT的消息）
        const unreadCount = await this.config.prisma.message.count({
          where: {
            conversationId: {
              in: await this.config.prisma.conversation.findMany({
                where: {
                  customer: userId,
                  shop: shop
                },
                select: { id: true }
              }).then(convs => convs.map(c => c.id))
            },
            senderType: 'AGENT',
            msgStatus: {
              in: ['SENT', 'DELIVERED']
            }
          }
        });

        // 获取该用户的未读消息（DELIVERED和SENT状态且发送者为AGENT的消息）
        const unreadMessages = await this.config.prisma.message.findMany({
          where: {
            conversationId: {
              in: await this.config.prisma.conversation.findMany({
                where: {
                  customer: userId,
                  shop: shop
                },
                select: { id: true }
              }).then(convs => convs.map(c => c.id))
            },
            senderType: 'AGENT',
            msgStatus: {
              in: ['DELIVERED','SENT']
            }
          },
          orderBy: {
            timestamp: 'asc'
          },
          take: 100 // 最多返回100条未读消息
        });

        if (!unreadMessages.length) return;
        // 发送未读消息列表给客户端
        this.ws.emit('unread_messages', {
          messages: unreadMessages,
          count: unreadCount
        });

        await beginLogger({
          level: 'info',
          message: `已发送未读消息列表给用户`,
          meta: {
            taskType: 'get_unread_messages',
            userId,
            unreadCount: unreadMessages.length,
            shop
          }
        });
      } catch (e) {
        await beginLogger({
          level: 'error',
          message: `处理获取未读消息请求失败`,
          meta: {
            taskType: 'get_unread_messages',
            error: {
              name: e?.name,
              message: e?.message,
              stack: e?.stack
            }
          }
        });
      }
    });

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
    this.ws.on('agent',async (info)=>{
      if(info){
        this.agent.set(info.id,this.ws.id)
        // 将客服ID和socketId的映射关系存储到Redis
        await this.config.redis.set(`agent_socket:${info.id}`, this.ws.id, 'EX', this.config.redisExpired)
        await beginLogger({
          level: 'info',
          message: `客服${info.name}上线了`,
          meta:{
            taskType: 'socket_util_agent'
          }
        })
        await this.triggerOfflineMessagePush(info.id)
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
          // 将用户ID和socketId的映射关系存储到Redis
          await this.config.redis.set(`user_socket:${prismaQuery.userId}`, this.ws.id, 'EX', this.config.redisExpired)
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
          // 将用户ID和socketId的映射关系存储到Redis
          await this.config.redis.set(`user_socket:${user.userId}`, this.ws.id, 'EX', this.config.redisExpired)
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
        payload.timestamp = Number(payload.timestamp)
        //数据表消息存储
        payload.timestamp = new Date(payload.timestamp).toISOString()
        const clonePayload = JSON.parse(JSON.stringify(payload))
        //传输的是产品时，数据库只存储部分关键数据，不全量存储
        if(payload.contentType === 'PRODUCT'){
          const content = JSON.parse(payload.contentBody)
          clonePayload.contentBody = JSON.stringify({
            id:content.id,
            title: content.title,
            onlineStorePreviewUrl: content.onlineStorePreviewUrl,
            vendor: content.vendor,
            description: content.description,
            featuredMedia: content.featuredMedia,
            tags: content.tags,
            compareAtPriceRange: content.compareAtPriceRange,
          })
        }
        const saveMessagePrisma = await this.config.prisma.message.create({
          data:{
            ...clonePayload,
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
  public socketOnAskAi = ()=>{
    //处理AI问答请求
    this.ws.on('askAi', async (data) => {
      try {
        const { prompt, conversationId, template, tone } = data;

        if (!prompt) {
          await beginLogger({
            level: 'warning',
            message: `收到无效的AI问答请求`,
            meta: {
              taskType: 'askAi',
              data
            }
          });
          return;
        }

        // 构建提示词工程选项
        const promptEngineerOptions: any = {};
        if (template) {
          promptEngineerOptions.template = template;
        }
        if (tone) {
          promptEngineerOptions.tone = tone;
        }

        // 调用AI获取回答
        const aiResponse = await chatWithAI(prompt, {
          promptEngineerOptions,
          enableTools: false
        });

        // 发送AI响应回客户端
        this.ws.emit('ai_response', {
          conversationId,
          response: aiResponse,
          timestamp: new Date().toISOString()
        });

        await beginLogger({
          level: 'info',
          message: `成功处理AI问答请求`,
          meta: {
            taskType: 'askAi',
            conversationId,
            template,
            tone
          }
        });
      } catch (e) {
        await beginLogger({
          level: 'error',
          message: `处理AI问答请求失败`,
          meta: {
            taskType: 'askAi',
            error: {
              name: e?.name,
              message: e?.message,
              stack: e?.stack
            }
          }
        });

        // 发送错误响应回客户端
        this.ws.emit('ai_error', {
          conversationId: data.conversationId,
          error: 'AI服务暂时不可用，请稍后再试',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  public socketUserOffline = ()=>{
    this.ws.on('offline',async ({id}:{id:string})=>{
      //用户或客服下线
      const isAgent = this.agent.has(id);
      const socketId = isAgent ? this.agent.get(id) : this.users.get(id);

      if(socketId){
        // 清理Redis中的socket映射
        const redisKey = isAgent ? `agent_socket:${id}` : `user_socket:${id}`;
        await this.config.redis.del(redisKey);

        await beginLogger({
          level: 'info',
          message: `${isAgent ? '客服' : '用户'}${id}下线`,
          meta:{
            taskType: 'socket_util_offline',
            userType: isAgent ? 'AGENT' : 'CUSTOMER',
            id
          }
        })
      }

      // 清理内存中的映射
      if(isAgent){
        this.agent.delete(id);
      } else {
        this.users.delete(id);
      }
    })
  }
  public static manualOffline = (id:string)=>{
    SocketUtils.agentMapInstance!.delete(id)
  }

  /**
   * 保存客服的聊天列表到数据库
   * @param agentId 客服ID
   * @param chatList 聊天列表数据
   * @param activeCustomerItem 当前激活的会话ID
   */
  public static async saveChatList(
    agentId: string,
    chatList: Array<{
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      isOnline?: boolean;
      lastMessage: string;
      lastTimestamp: string | number;
      hadRead?: boolean;
      isActive?: boolean;
      unreadMessageCount?: number;
      conversationId?: string;
    }>,
    activeCustomerItem?: string,
    shopDomain?: string
  ) {
    try {
      // 获取prisma实例
      const { prismaClient } = await import('../plugins/prismaClient.ts');
      const prisma = prismaClient;

      // 获取客服信息
      const agent = await prisma.staffProfile.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error('客服信息不存在');
      }

      // 获取商店信息
      let shop;
      if (shopDomain) {
        shop = await prisma.shop.findUnique({
          where: { shopify_domain: shopDomain }
        });
      } else {
        // 如果没有提供shopDomain，尝试从第一个聊天项获取商店信息
        if (chatList.length > 0 && chatList[0].conversationId) {
          const conversation = await prisma.conversation.findUnique({
            where: { id: chatList[0].conversationId }
          });
          if (conversation) {
            shop = await prisma.shop.findFirst({
              where: { shopify_domain: conversation.shop }
            });
          }
        }
      }

      if (!shop) {
        throw new Error('商店信息不存在');
      }

      // 使用事务批量更新聊天列表
      await prisma.$transaction(async (tx) => {
        for (const item of chatList) {
          if (!item.conversationId) continue;

          // 转换时间戳
          let lastTimestamp: Date | null = null;
          if (typeof item.lastTimestamp === 'number') {
            lastTimestamp = new Date(item.lastTimestamp);
          } else {
            lastTimestamp = new Date(item.lastTimestamp);
          }

          // 使用upsert更新或创建聊天列表项
          await tx.chatListItem.upsert({
            where: { conversationId: item.conversationId },
            update: {
              customerFirstName: item.firstName,
              customerLastName: item.lastName,
              customerAvatar: item.avatar,
              lastMessage: item.lastMessage,
              lastTimestamp: lastTimestamp,
              isOnline: item.isOnline || false,
              hadRead: item.hadRead || false,
              isActive: item.isActive || false,
              unreadMessageCount: item.unreadMessageCount || 0,
              agentId: agentId,
              shop: shop.id,
              updatedAt: new Date()
            },
            create: {
              conversationId: item.conversationId,
              customerId: item.id,
              customerFirstName: item.firstName,
              customerLastName: item.lastName,
              customerAvatar: item.avatar,
              lastMessage: item.lastMessage,
              lastTimestamp: lastTimestamp,
              isOnline: item.isOnline || false,
              hadRead: item.hadRead || false,
              isActive: item.isActive || false,
              unreadMessageCount: item.unreadMessageCount || 0,
              agentId: agentId,
              shop: shop.id
            }
          });
        }
      });

      await beginLogger({
        level: 'info',
        message: `成功保存客服${agentId}的聊天列表，共${chatList.length}条`,
        meta: {
          taskType: 'save_chat_list',
          agentId,
          shop: shop.id,
          chatListCount: chatList.length
        }
      });
    } catch (error) {
      await beginLogger({
        level: 'error',
        message: `保存客服${agentId}的聊天列表失败`,
        meta: {
          taskType: 'save_chat_list',
          agentId,
          error: {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
          }
        }
      });
      throw error;
    }
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
