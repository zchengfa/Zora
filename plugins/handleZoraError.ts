import path from "path";
import {beginLogger} from "./bullTaskQueue.ts";

export const handlePrismaError = (e:any)=>{
  const err = e.toString()
  let errMsg = ''
  if(err.indexOf('PrismaClientInitializationError') !== -1){
    if(err.indexOf('Authentication failed') !== -1){
      errMsg = '数据库连接失败，env文件中配置的数据库参数是否有误！'
    }
    else if(err.indexOf("Can't reach database server") !== -1){
      errMsg = '未检测到数据库服务，请确认数据库服务已开启！'
    }
  }
  else if(err.indexOf('PrismaClientKnownRequestError') !== -1){
    if(err.indexOf('Unique constraint failed') !== -1){
      const uniqueModel = e.meta.modelName
      const uniqueKey = e.meta.target.replace('_key','').replace(e.meta.modelName+"_",'')
      errMsg = `Model:${uniqueModel}具有唯一约束,唯一约束key:${uniqueKey}，无法再次创建`
    }
  }
  else if(err.indexOf('TypeError') !== -1){
    errMsg = 'Prisma客户端查询的 Model 属性错误，请确认是否有该 Model 属性！'
  }
  else if(err.indexOf('PrismaClientValidationError') !== -1){
    errMsg = `检测到您提供的数据中，有不符合model设置的字段类型`
  }
  beginLogger({
    level: "error",
    message: errMsg,
    meta:{
      taskType: 'prisma_error',
    }
  }).then()
}

export const handleApiError = (req:Request,e:any)=>{
  beginLogger({
    level: 'error',
    message: `${req.path}请求出现错误`,
    meta:{
      taskType: `zora_api`,
      requestUrl: req.url,
      error:{
        name: e?.name,
        message: e?.message,
        stack: e?.stack,
      }
    }
  }).then()
}

export const currentFileName = (target = import.meta.url,state = false)=>{
  return `${state ? '✅' + ' ' : '❌' + ' '}From(${path.basename(target)})${state ? 'zora提示' : 'zora出错'}：`
}
