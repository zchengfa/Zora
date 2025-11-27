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
  console.log(`Prisma出错了：❌ ${errMsg}`)
}
