import {PrismaClient} from "@prisma/client"

export const prismaClient = new PrismaClient({
  transactionOptions:{
    timeout: 15000, //事务超时时间增加到15秒
    maxWait: 5000, //最大等待时间增加到5秒
  }
})
