import type {PrismaClient} from "@prisma/client";
import {currentFileName} from "../plugins/handleZoraError.ts";
export default async function PrismaSeed (prisma:PrismaClient){
  try{
    const prismaQuery = await prisma.customerServiceStaff.findFirst({
      select:{
        id: true
      }
    })
    //没有找到，说明数据表是空的，可以插入数据
    if(!prismaQuery){
      await prisma.customerServiceStaff.create({
        data:{
          name: "小雅",
          avatarUrl: process.env.AGENT_DEFAULT_AVATAR,
        }
      })

      return (`${currentFileName(import.meta.url,true)}数据库表customer_service_staff初始化成功`);
    }
    return (`${currentFileName(import.meta.url,true)}数据库表customer_service_staff无需初始化`);
  }
  catch(err){
    return (`${currentFileName(import.meta.url)}数据库表customer_service_staff初始化失败`+err);
  }
}
