import type {Redis} from "ioredis";
import {$Enums, PrismaClient} from "@prisma/client";
import {Server, Socket} from "socket.io";

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
  private agent: Map<string,string>;
  constructor(config:SocketUtilConfigType,ws:Socket,users:Map<string,string>,agent:Map<string,string>) {
    this.config = config
    this.ws = ws
    this.users = users
    this.agent = agent
    this.repostMessageAck()
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
  private sendMessageAck = (sender:string,msgId:string,status:'SENT' | 'DELIVERED' | 'FAILED' | 'READ',codeType:number)=>{
    this.config.io.to(sender).emit('message_ack',{
      type: 'ACK',
      msgId,
      msgStatus:status,
      code: this.getAckCode(codeType),
      timestamp: new Date().toISOString()
    })
  }
  private repostMessageAck = ()=>{
    this.ws.on('message_delivered',(payload)=>{
      this.sendMessageAck(this.users.get(payload.recipientId) as string,payload.msgId,'DELIVERED',10004)
    })
  }
  public socketAgentOnline = ()=>{
    //客服连接
    this.ws.on('agent',()=>{
      this.agent.set('id',this.ws.id)
      console.log('客服上线了')
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
          console.log(prismaQuery.email + '上线了')
        }
        else{
          this.users.set(user.userId,this.ws.id)
          console.log(redisQuery+'上线了')
        }
      }
      catch (e) {
        console.log('出错了：socketServer.ts')
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
        console.log('出错了：socketServer.ts')
      }
    })
  }
  public socketOnSendMessage = ()=>{
    //消息发送
    this.ws.on('sendMessage',async (data)=>{
      const payload = JSON.parse(data)
      try{
        //查看接收者在不在线，不在线则需要保存离线消息
        //判断消息体中的recipientType,若是AGENT，表示是发给客服的，CUSTOMER表示发给客户的
        let recipient = undefined
        if(payload.recipientType === 'AGENT'){
          recipient = this.agent.get('id')
        }
        else{
          recipient = this.users.get(payload.recipientId)
        }
        //接收者不在线
        if(!recipient){
          const saveMessagePrisma = await this.config.prisma.message.create({
            data:{
              ...payload,
              msgStatus: "SENT"
            }
          })
          const redis_key =  payload.recipientType === 'AGENT' ? 'AGENT' : payload.recipientId
          await this.config.redis.lpush(`offline_messages:${redis_key}`,JSON.stringify(saveMessagePrisma))
          await this.config.redis.expire(`offline_messages:${redis_key}`,this.config.redisExpired)
          //告诉发送者，服务器接收到消息，消息已发送，但用户不在线
          this.sendMessageAck(this.users.get(payload.senderId) as string,payload.msgId,'SENT',10001)
        }
        else{
          this.config.io.to(recipient).emit('message',payload)
        }

      }
      catch (e) {
        //服务器出现错误，告诉发送者消息发送失败
        this.sendMessageAck(this.users.get(payload.senderId) as string,payload.msgId,'FAILED',10003)
      }
    })
  }
}
