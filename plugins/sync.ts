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
   const customers = await prisma.customers.findMany()
   const customerTag = await prisma.customer_tags.findMany()
   const customerAddress = await prisma.customer_addresses.findMany()
   const customerTagRelation = await prisma.customer_tag_relations.findMany()
   const session = await prisma.session.findMany()

   // 如果数据不为空，则写入Redis
   if (customers.length > 0) {
     // 使用管道批量操作
     const pipeline = redis.pipeline();

     // 存储客户基本信息为 Hash
     for (const customer of customers) {
       pipeline.hset(`customer:${customer.email}`, {
         ...customer
       });
       pipeline.expire(`customer:${customer.email}`,EXPIRED)
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
       const id = item.userId ? item.userId : 999999999
       pipeline.hset(`session:${id}`,{...item})
       pipeline.expire(`session:${id}`,EXPIRED)
     }

     // 执行管道中的命令
     await pipeline.exec();
     return "zora提示✅：redis数据同步成功"
   }
   else {
     return "zora提示😢：没有可同步的数据"
   }

 }
 catch (e){
   handlePrismaError(e)
 }
}
