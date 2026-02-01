import type {PrismaClient} from "@prisma/client";
import Redis from "ioredis";
import {handlePrismaError} from "./handleZoraError.ts";

interface SyncRedisType {
  prisma:PrismaClient,
  redis:Redis
}

export const syncRedis = async ({prisma,redis}:SyncRedisType)=>{
  try {
    const EXPIRED = 24 * 60 * 60
    const conversations = await prisma.conversation.findMany()
    const customers = await prisma.customers.findMany()
    const customerTag = await prisma.customer_tags.findMany()
    const customerAddress = await prisma.address.findMany()
    const customerTagRelation = await prisma.customer_tag_relations.findMany()
    const session = await prisma.session.findMany()
    const customerStaff = await prisma.customerServiceStaff.findMany()
    const shops = await prisma.shop.findMany()
    const offlineMessages = await prisma.offlineMessage.findMany({
      where: {
        isDelivered: false
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 使用管道批量操作
    const pipeline = redis.pipeline();
    // 如果数据不为空，则写入Redis
    if (customers.length) {
      // 存储客户基本信息为 Hash
      for (const customer of customers) {
        pipeline.hset(`customer:${customer.id}`, {
          ...customer
        });
        pipeline.expire(`customer:${customer.id}`,EXPIRED)
      }
    }
    //存储消息会话
    for (const conversation of conversations) {
      pipeline.hset(`conversation:${conversation.id}`, {...conversation})
      pipeline.expire(`conversation:${conversation.id}`,EXPIRED)
    }

    // 存储标签信息
    for (const tag of customerTag) {
      pipeline.hset(`tag:${tag.id}`, {
        ...tag
      })
      pipeline.expire(`tag:${tag.id}`,EXPIRED)
    }
    // 存储地址信息
    for (const address of customerAddress) {
      pipeline.hset(`address:${address.id}`, {
        ...address
      });
      pipeline.expire(`address:${address.id}`,EXPIRED)
    }

    // 存储关系（使用 Set）
    for (const relation of customerTagRelation) {
      pipeline.sadd(`customer:${relation.customer_id}:tags`, relation.tag_id.toString());
      pipeline.expire(`customer:${relation.customer_id}:tags`,EXPIRED)
      pipeline.sadd(`tag:${relation.tag_id}:customers`, relation.customer_id.toString());
      pipeline.expire(`tag:${relation.tag_id}:customers`,EXPIRED)
    }

    //存储session
    for (const item of session){
      const id = item.userId ? item.userId : item.shop
      pipeline.hset(`session:${id}`,{...item})
      pipeline.expire(`session:${id}`,EXPIRED)
    }

    for (const staff of customerStaff){
      pipeline.hset(`AGENT:${staff.id}`,{...staff})
      pipeline.expire(`AGENT:${staff.id}`,EXPIRED)
    }

    for (const shop of shops) {
      pipeline.hset(`shop:installed:${shop.shopify_domain}`, {id:shop.id})
      pipeline.expire(`shop:installed:${shop.shopify_domain}`,EXPIRED)
    }

    // 同步离线消息到Redis
    // 按接收者分组存储离线消息
    const offlineMessagesByRecipient = new Map<string, any[]>()
    for (const msg of offlineMessages) {
      const key = msg.recipientId
      if (!offlineMessagesByRecipient.has(key)) {
        offlineMessagesByRecipient.set(key, [])
      }
      offlineMessagesByRecipient.get(key)!.push({
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
        createdAt: msg.createdAt,
        isOffline: true
      })
    }

    // 将离线消息存储到Redis列表中
    for (const [recipientId, messages] of offlineMessagesByRecipient) {
      const key = `offline_messages:${recipientId}`
      // 先清空该用户的离线消息列表
      await redis.del(key)
      // 将消息按时间顺序添加到列表中（最新的在列表末尾）
      for (const msg of messages) {
        pipeline.rpush(key, JSON.stringify(msg))
      }
      // 设置过期时间为7天
      pipeline.expire(key, 7 * 24 * 60 * 60)
    }

    // 执行管道中的命令
    await pipeline.exec();

    return {
      result:true,
      message:"zora提示✅：redis执行数据同步成功",
      meta:{
        taskType:"redis_sync_db_data",
        shopCount: shops.length,
        customerCount: customers.length,
        conversationsCount: conversations.length,
        customerAddressCount: customerAddress.length,
        customerTagCount: customerTag.length,
        customerStaffCount: customerStaff.length,
        customerTagRelationCount: customerTagRelation.length,
        sessionCount: session.length,
        offlineMessageCount: offlineMessages.length,
      }
    }
  }
  catch (e){
    handlePrismaError(e)
  }
}
