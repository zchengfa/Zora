import type {Express, Response} from "express-serve-static-core"
import {
  generateVerifyCode,
  hashCode,
  RegexEmail,
  validate,
  validateHashCode,
  validateRequestSender
} from "../plugins/validate.ts";
import rateLimiter from 'express-rate-limit'
import Redis from "ioredis";
import type {PrismaClient} from "@prisma/client";
import bcrypt from 'bcrypt';
import {handleApiError, handlePrismaError} from "../plugins/handleZoraError.ts";
import {v4 as uuidv4} from "uuid";
import {createToken, verifyTokenAsync} from "../plugins/token.ts";
import type {IShopifyApiClient, IShopifyApiClientsManager} from "../plugins/shopifyUtils.ts";
import {executeShopifyId, shopifyHandleResponseData} from "../plugins/shopifyUtils.ts";
import {addShopifySyncDataJob, beginLogger, addShopDataCleanupJob, addOrderFulfillmentJob} from "../plugins/bullTaskQueue.ts";
import type {GraphqlCustomerCreateMutationResponse, GraphqlMutationVariables} from "../plugins/shopifyMutation.ts";
import {generateCustomerProfile} from "../plugins/customerProfile.ts";

interface ZoraApiType {
  app:Express,
  redis: Redis,
  prisma: PrismaClient,
  shopifyApiClientsManager: IShopifyApiClientsManager,
  redlock: any,
}

interface FormDataType {
  email: string,
  password?: string,
  firstName: string,
  lastName: string,
  marketEmail: boolean,
  marketSMS: boolean,
  id?: bigint,
  shopDomain?:string,
  authPwd: boolean,
  authCode?: string,
}

const REDIS_EMAIL_APPEND = '_verify_code'
const REDIS_AUTH_CODE_APPEND = '_verify_auth_code'
const REDIS_ATTEMPT_KEY = '_attempt_count'
const REDIS_AUTH_ATTEMPT_KEY = '_auth_attempt_count'
const EXPIRED = 300
const SESSION_EXPIRED_DURATION = 7 * 24 * 60 * 60 * 1000

/**
 * 从Shopify API获取商店信息并同步到数据库
 * @param shopDomain 商店域名
 * @param prisma Prisma客户端实例
 * @param shopifyApiClientsManager Shopify API客户端管理器
 * @returns 返回同步后的商店信息，如果同步失败则返回null
 */
const syncShopData = async (
  shopDomain: string,
  prisma: PrismaClient,
  shopifyApiClientsManager: IShopifyApiClientsManager
) => {
  try {
    const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shopDomain)
    const shopResult = await shopifyApiClient.shop()

    const data = {
      id: executeShopifyId(shopResult.shop.id),
      name: shopResult.shop.name,
      email: shopResult.shop.email,
      shop_owner_name: shopResult.shop.shopOwnerName,
      shopify_plus: shopResult.shop.plan.shopifyPlus,
      shopify_domain: shopResult.shop.myshopifyDomain,
      partner_development: shopResult.shop.plan.partnerDevelopment,
      public_display_name: shopResult.shop.plan.publicDisplayName,
      createdAt: shopResult.shop.createdAt,
      updatedAt: shopResult.shop.updatedAt,
      is_installed: true
    }

    const shop = await prisma.shop.upsert({
      where:{
        shopify_domain: shopDomain
      },
      update:data,
      create:data
    })

    await beginLogger({
      level: "info",
      message:`${shopDomain}数据同步完成`,
      meta:{
        taskType: `sync_shopify_shop_data_prisma`,
        shop: shopDomain
      }
    })

    return shop
  } catch (e) {
    console.log(e)
    handlePrismaError(e)
    return null
  }
}

const getRedisStorageKey = (target: string, append: string = REDIS_EMAIL_APPEND) => `${target}${append}`

//限制器工厂函数
const createRateLimiter = (limit: number, windowMs: number = 60000) => {
  return rateLimiter({
    windowMs,
    limit,
    message: "Your request is too frequent. Please try again later"
  })
}

//定义限制级别
const RATE_LIMITS = {
  STRICT: createRateLimiter(3),
  NORMAL: createRateLimiter(60),
  LOOSE: createRateLimiter(300),
}

const loginAuth = async ({prisma,paramsObj,shopifyApiClientsManager,redis,res}:{prisma:PrismaClient,paramsObj:FormDataType,shopifyApiClientsManager:IShopifyApiClientsManager,redis:Redis,res:Response})=>{
  const session_id = uuidv4()
  const expired = new Date(new Date().getTime() + SESSION_EXPIRED_DURATION)
  const sessionPrismaUpsert = await prisma.session.upsert({
    where:{
      email:paramsObj.email
    },
    update:{
      sessionId:session_id,
      expires:expired
    },
    create:{
      sessionId: session_id,
      userId: paramsObj.id,
      firstName: paramsObj.firstName,
      lastName: paramsObj.lastName,
      email: paramsObj.email,
      expires: expired,
    }
  })
  //获取客服数据给客户
  let agentInfo = undefined
  //获取商店对应的shopify api请求客户端
  const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(paramsObj.shopDomain as string)

  try{
    const {shop} = await shopifyApiClient.shop()
    agentInfo = await prisma.staffProfile.findFirst({
      where: {
        email: shop.email
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      }
    })
  }
  catch (e) {
    handlePrismaError(e)
  }

  const token = createToken({session_id},'1d')
  const username = sessionPrismaUpsert.firstName as string + sessionPrismaUpsert.lastName as string
  res.status(200).send({result:true,message:'login successfully',token,userInfo:{userId:paramsObj.id?.toString(),username,avatar:paramsObj.image_url,agentInfo}})
}

const pwdCompare = async (paramsObj:FormDataType,databasePwd:string,res:Response,redis:Redis,prisma:PrismaClient,shopifyApiClientsManager:IShopifyApiClientsManager)=>{
  try{
    const result = await bcrypt.compare(paramsObj.password,databasePwd)
    if(result){
      await loginAuth({paramsObj,redis,shopifyApiClientsManager,res,prisma})
    }
    else{
      res.status(200).send({result:false,message:'login failed with invalid credentials'})
    }
  }
  catch (e) {
    handlePrismaError(e)
    res.status(500).send({result:false,message:"Server Error"})
  }
}

const loginFunction = async ({redis,prisma,paramsObj,res,shopifyApiClientsManager}:{redis:Redis,prisma:PrismaClient,paramsObj:FormDataType,res:Response,shopifyApiClientsManager:IShopifyApiClientsManager})=>{
  try{
    //判断是否是以密码验证方式进行登录
    if(!paramsObj.authCode){
      if(!paramsObj.password) return res.status(400).send({result:false,message:"invalid credentials"})
      //查询该用户的密码进行比对
      const redisPwdQuery = await redis.hget(`customer:${paramsObj.email}`,'password')
      //是否命中
      if(redisPwdQuery){
        await pwdCompare(paramsObj,redisPwdQuery,res,redis,prisma,shopifyApiClientsManager)
      }
      else{
        const prismaPwdQuery = await prisma.customers.findUnique({
          where:{
            email:paramsObj.email
          }
        })

        await redis.hset(`customer:${paramsObj.email}`, {...prismaPwdQuery})
        await redis.expire(`customer:${paramsObj.email}`,24 * 60 * 60)
        await pwdCompare(paramsObj,prismaPwdQuery.password,res,redis,prisma,shopifyApiClientsManager)
      }
    }
    else{
      if(!paramsObj.authCode) return res.status(400).send({result:false,message:"invalid credentials"})
      try{
        const attempt = await redis.get(getRedisStorageKey(paramsObj.email,REDIS_AUTH_ATTEMPT_KEY)) || 0
        const attemptKey = getRedisStorageKey(paramsObj.email,REDIS_AUTH_ATTEMPT_KEY)

        if(parseInt(String(attempt)) >= 5){
          return res.status(429).send({
            result:false,
            message: 'Too many attempts, please obtain the verification code again'
          })
        }

        const redisHashCode = await redis.get(paramsObj.email+REDIS_AUTH_CODE_APPEND)
        if(redisHashCode){
          if(validateHashCode(paramsObj.authCode,redisHashCode)){
            //验证码正确，允许登录，删除redis中存储的对应验证码和验证次数
            await redis.del(attemptKey)
            await redis.del(getRedisStorageKey(paramsObj.email))
            await loginAuth({paramsObj,redis,shopifyApiClientsManager,res,prisma})
          }
          else{
            //验证码错误，增加验证次数
            await redis.incr(attemptKey)
            await redis.expire(attemptKey,EXPIRED)
            res.status(200).send({result:false ,left_attempt:5 - Number(attempt) -1, message:`Auth code error, you still have ${5 - Number(attempt)-1} chances to try`})
          }
        }
        else{
          res.status(200).send({result:false,message:'code expired'})
        }
      }
      catch (e) {
        res.status(500).send({server_error: true,message:'server error'})
      }
    }
  }
  catch (e) {
    res.status(500).send({result:false,message:"Server Error"})
  }
}

export function zoraApi({app,redis,prisma,shopifyApiClientsManager}:ZoraApiType) {

  app.post('/shopifyApiClientInit',async (req, res)=>{
    try {
      const paramsObj = req.body
      if(!paramsObj?.shop){
        return res.status(400).send({result:false,message:"request invalid"})
      }
      const {shop} = paramsObj
      res.send({result:true,message:`${shop}的shopifyApiClient初始化完成，数据同步已在后台开启`})

      //增加session同步到redis操作，以防应用安装后，redis中的session未更新，导致shopify api请求所需的令牌失效
      const prismaSession = await prisma.session.findFirst({
        where:{
          shop
        }
      })

      await redis.hset(`session:${shop}`,{...prismaSession})
      await redis.expire(`session:${shop}`, SESSION_EXPIRED_DURATION / 7)

      await beginLogger({
        level: 'info',
        message: `${shop}的shopifyApiClient初始化完成`,
        meta:{
          taskType: `zora_api`,
          shop
        }
      })

      //获取商店数据
      try{
        await syncShopData(shop, prisma, shopifyApiClientsManager)
      }
      catch (e) {
        console.log(e)
        handlePrismaError(e)
      }

      //将数据获取与同步任务交给bull进行后台处理，不阻塞主线程
      const maskTypeArr = ['customers','orders','products']
      for (const mask of maskTypeArr) {
        await addShopifySyncDataJob(mask,shop)
      }
    }
    catch (e) {
      handleApiError(req, e)
    }

  })

  app.post('/authenticator', RATE_LIMITS.STRICT,async (req, res) => {
    const paramsObj = req.body
    if(!paramsObj || !paramsObj?.email || (!paramsObj?.password.length && !paramsObj?.authCode.length)){
      return res.status(400).send({result:false,message:"invalid request"})
    }

    //邮箱不合规或者请求发送者不是来自应用安装者的商店，拦截
    const requestSenderResult = await validateRequestSender(req)
    if(!RegexEmail(paramsObj.email) || !requestSenderResult){
      return res.status(400).send({result:false,message:"invalid request"})
    }

    paramsObj.shopDomain = req.headers?.origin?.split('//')[1]
    //先判断之前是否已经注册过了
    try{
      const redisQuery = await redis.hgetall(`customer:${paramsObj.email}`)
      //检查是否命中，未命中则再去数据库查询
      if(Object.keys(redisQuery).length > 0){
        //redis命中，表示需要登录
        paramsObj.id = redisQuery.id
        paramsObj.firstName = redisQuery.first_name
        paramsObj.lastName = redisQuery.last_name
        paramsObj.image_url = redisQuery.image_url
        await loginFunction({redis,prisma,paramsObj,res,shopifyApiClientsManager})
      }
      else{
        //未命中
        const prismaQuery = await prisma.customers.findUnique({
          where:{
            email: paramsObj.email
          }
        })
        //查询到数据，同步到redis中,执行登录操作
        if(prismaQuery){
          await redis.hset(`customer:${prismaQuery.id}`, {...prismaQuery})
          await redis.expire(`customer:${prismaQuery.id}`, 60 * 60 * 24)
          //登录
          paramsObj.id = prismaQuery.id
          paramsObj.firstName = prismaQuery.first_name
          paramsObj.lastName = prismaQuery.last_name
          paramsObj.image_url = prismaQuery.image_url
          await loginFunction({redis,prisma,paramsObj,res,shopifyApiClientsManager})
        }
        else{
          if(!paramsObj.password.length) return res.status(400).send({result:false,message:"invalid request: pwd is required"})
          /**需要注册，执行在shopify商店执行客户写入
           * 1、shopify api先通过邮箱执行获取客户操作，判断shopify商店是否有该客户，有就同步到数据库中，没有再使用shopify api执行客户注册操作
           * */
          const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(paramsObj.shopDomain)
          const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
            emailAddress: paramsObj.email,
          })
          let deepCloneCustomer = []
          const data:Array<GraphqlCustomerCreateMutationResponse["customerCreate"]['customer'] | {shop_id:string}> = []

          //查询结果为null，表示shopify商店没有该客户，需要执行添加客户请求
          if(!customerByIdentifier){
            const customerCreateMutationVariable:GraphqlMutationVariables["input"] = {
              email: paramsObj.email,
              lastName: paramsObj.lastName,
              firstName: paramsObj.firstName,
              emailMarketingConsent: {
                marketingState: paramsObj.marketEmail ? 'SUBSCRIBED' : 'NOT_SUBSCRIBED',
                marketingOptInLevel: 'SINGLE_OPT_IN'
              }
            }
            const {customerCreate} = await shopifyApiClient.customerCreate(customerCreateMutationVariable)
            if(customerCreate.customer){
              deepCloneCustomer = JSON.parse(JSON.stringify(customerCreate.customer))
            }
          }
          else{
            //查询结果不为null，表示shopify商店有该客户，需要同步到数据库中
            deepCloneCustomer = JSON.parse(JSON.stringify(customerByIdentifier))
          }
          deepCloneCustomer.shop_id = requestSenderResult
          data.push(deepCloneCustomer)
          await shopifyHandleResponseData(data,'customers',prisma)
          //客户写入默认是没有密码和头像的的，为了嵌入块能以密码方式登录，需要在客户写入数据库后设置密码,设置默认头像
          const bcryptHashPwd = await bcrypt.hash(paramsObj.password,10)
          const newCustomer = await prisma.customers.update({
            where:{
              shopify_customer_id: deepCloneCustomer.id
            },
            data:{
              password: bcryptHashPwd,
              image_url: process.env?.USER_DEFAULT_AVATAR || null
            }
          })

          if(newCustomer){
            await redis.hset(`customer:${newCustomer.id}`, {...newCustomer})
            await redis.expire(`customer:${newCustomer.id}`,24 * 60 * 60)
            //执行登录
            paramsObj.id = newCustomer.id
            paramsObj.image_url = newCustomer.image_url
            await loginFunction({redis,prisma,paramsObj,res,shopifyApiClientsManager})
          }
        }
      }
    }
    catch (e){
      handleApiError(req,e)
      handlePrismaError(e)
      res.status(500).send({result:false,message:"Server Error"})
    }
  })
  app.post('/validateToken',RATE_LIMITS.NORMAL,async (req, res)=>{
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).send({result:false,message: 'Authentication token missing'})
    }
    if(!await validateRequestSender(req)){
      return res.status(400).send({result:false,message:"invalid request"})
    }
    try{
      await verifyTokenAsync(token)
      res.status(200).send({result:true,message:'logged in'})}
    catch (e){
      handleApiError(req, e)
      return res.status(401).send({result:false,message: 'Token expired or invalid'})
    }
  })
  app.post('/checkEmail',RATE_LIMITS.NORMAL,async (req,res)=>{
    const {email} = req.body
    if(!await validateRequestSender(req)){
      return res.status(400).send({result:false,message:"invalid request"})
    }
    //检查数据库是否有该邮箱
    try{
      const redisEmailQuery = await redis.hexists(`customer:${email}`,'shop_id')
      //是否命中
      if(redisEmailQuery){
        res.status(200).send({result:true,message:"Email already exists",isBelongShop:!!redisEmailQuery})
      }
      else{
        const prismaEmailQuery = await prisma.customers.findUnique({
          where:{
            email
          }
        })
        //数据库有该邮箱
        if(prismaEmailQuery){
          //将读取到的信息同步到 redis
          await redis.hset(`customer:${email}`,{...prismaEmailQuery})
          await redis.expire(`customer:${email}`, 3600)
          res.status(200).send({result:true,message:"Email already exists",isBelongShop:!!prismaEmailQuery.shop_id})
        }
        else{
          res.status(200).send({result:false,message:"Email not available"})
        }
      }
    }
    catch (e){
      handleApiError(req, e)
      res.status(500).send({result:false,message:"Server Error"})
    }
  })

  app.post('/sendVerifyCodeToEmail',RATE_LIMITS.STRICT,async (req,res)=>{
     const {email,isAuth} = req.body
     if(!email || isAuth === undefined || !await validateRequestSender(req)){
       return res.status(400).send({result:false,message: 'Invalid request'})
     }
     try {
       const code = generateVerifyCode()
       //发送成功保存验证码到redis中，并设置过期时间，并清除之前验证的次数，防止用户在验证次数时间未过期时重新获取验证码却还是提示验证次数过多
       if(!isAuth){
         await redis.multi()
           .setex(getRedisStorageKey(email),EXPIRED,hashCode(code))
           .setex(getRedisStorageKey(email,REDIS_ATTEMPT_KEY),EXPIRED,0)
           .exec()
       }
       else{
         await redis.multi()
           .setex(getRedisStorageKey(email,REDIS_AUTH_CODE_APPEND),EXPIRED,hashCode(code))
           .setex(getRedisStorageKey(email,REDIS_AUTH_ATTEMPT_KEY),EXPIRED,0)
           .exec()
       }

       validate({email,code,expired:EXPIRED}).then(async (res)=>{
         await beginLogger({
           level: 'info',
           message: `email:${email} send code success`,
           meta:{
             type: 'nodemailer_send_code',
             result: res
           }
         })
       })
         .catch(async (e)=>{
           await beginLogger({
             level: 'error',
             message: `email:${email} send code failed`,
             meta:{
               type: 'nodemailer_send_code',
               error: e
             }
           })
         })

       res.status(200).send({success:true,code_expired:EXPIRED,message:'code send successfully'})
     }
     catch (e) {
       handleApiError(req, e)
       res.status(500).send({server_error: true,message:'server error'})
     }

  })

    app.post('/verifyCode', RATE_LIMITS.LOOSE,async (req, res) => {
        const {code,email} = req.body
        if(!await validateRequestSender(req)){
          return res.status(400).send({result:false,message:"invalid request"})
        }
        /**
         * 将验证码与redis中的验证码进行比对，还需增加比对次数，防止暴力破解
         * 1.从redis中获取对应的验证码
         *  1.1 redis没有获取到验证码，表示验证码过期了或者用户没有执行过邮箱验证程序
         *  1.2 redis中获取到了，进行验证码比对，将比对结果反馈给前端
         */
        try{
            const attempt = await redis.get(getRedisStorageKey(email,REDIS_ATTEMPT_KEY)) || 0
            const attemptKey = getRedisStorageKey(email,REDIS_ATTEMPT_KEY)

            if (!code || !email) {
                return res.status(400).send({
                    result: false,
                    left_attempt:5 - Number(attempt),
                    message: 'Incomplete parameters'
                });
            }

            if(parseInt(String(attempt)) >= 5){
              return res.status(429).send({
                result:false,
                message: 'Too many attempts, please obtain the verification code again'
              })
            }

            const redisHashCode = await redis.get(email+REDIS_EMAIL_APPEND)
            if(redisHashCode){
                if(validateHashCode(code,redisHashCode)){
                    //验证码正确，结果反馈，删除redis中存储的对应验证码和验证次数
                    await redis.del(attemptKey)
                    await redis.del(getRedisStorageKey(email))
                    res.status(200).send({result: true,message:'validate success'})
                }
                else{
                    //验证码错误，增加验证次数
                    await redis.incr(attemptKey)
                    await redis.expire(attemptKey,EXPIRED)
                    res.status(200).send({result:false ,left_attempt:5 - Number(attempt) -1, message:`Verification code error, you still have ${5 - Number(attempt)-1} chances to try`})
                }
            }
            else{
                res.status(200).send({result:false,message:'code expired'})
            }
        }
        catch (e) {
          handleApiError(req, e)
          res.status(500).send({server_error: true,message:'server error'})
        }
    })

    app.get('/shopifyUserInfo',async (req, res)=>{
      const {id} = req.query
      try{
        const redisQueryCustomer = await redis.hgetall(`customer:${id}`)
        let userInfo = {}
        if(!Object.keys(redisQueryCustomer).length){
          const prismaQueryCustomer = await prisma.customers.findUnique({
            where:{
              id: Number(id),
            }
          })
          await redis.hset(`customer:${id}`, {...prismaQueryCustomer})
          await redis.expire(`customer:${id}`, SESSION_EXPIRED_DURATION / 7)
          userInfo = {
            id: prismaQueryCustomer?.id.toString(),
            first_name: prismaQueryCustomer?.first_name,
            last_name: prismaQueryCustomer?.last_name,
            image_url: prismaQueryCustomer?.image_url
          }
        }
        else{
          userInfo = {
            id: redisQueryCustomer?.id.toString(),
            first_name: redisQueryCustomer?.first_name,
            last_name: redisQueryCustomer?.last_name,
            image_url: redisQueryCustomer?.image_url
          }
        }

        res.status(200).send({result:true,userInfo})
      }
      catch (e){
        handleApiError(req, e)
        res.status(500).send({server_error: true,message:'server error'})
      }

    })

  app.post('/shopifyCustomerStaffInit',async (req, res) => {
    const {email,shopOwnerName,shopDomain} = req.body

    if(!email || !shopOwnerName || !shopDomain){
      return res.status(400).json({errMsg:'missing required parameters'})
    }
    try{
      // 查询商店信息
      let shop = await prisma.shop.findUnique({
        where: {
          shopify_domain: shopDomain
        }
      })

      // 如果商店不存在，尝试从Shopify API获取商店信息并同步到数据库
      if(!shop){
        shop = await syncShopData(shopDomain, prisma, shopifyApiClientsManager)
        if(!shop){
          return res.status(500).json({errMsg:'failed to sync shop data'})
        }
      }

      // 查询是否已存在该email的客服资料
      let staffProfile = await prisma.staffProfile.findFirst({
        where: {
          email: email
        }
      })

      // 如果不存在，创建新的客服资料
      if(!staffProfile){
        staffProfile = await prisma.staffProfile.create({
          data: {
            name: shop.shop_owner_name,
            email: shop.email,
            avatarUrl: process.env.AGENT_DEFAULT_AVATAR,
            shop_id: shop.id.toString()
          }
        })
      }

      // 在新模型中，我们不再需要创建客服关联，直接返回客服资料信息
      const result = {
        id: staffProfile.id,
        email: staffProfile.email,
        avatarUrl: staffProfile.avatarUrl,
        name: staffProfile.name
      }
      res.status(200).json(result)
    }
    catch (e) {
      handleApiError(req, e)
      res.status(500).json({errMsg:'server error'})
    }

  })

  // 获取客服的聊天列表
  app.get('/chatList', async (req, res) => {
    try {
      const { agentId } = req.query;

      if (!agentId || typeof agentId !== 'string') {
        return res.status(400).json({ error: '缺少agentId参数' });
      }

      // 获取客服信息以获取shop
      const agent = await prisma.staffProfile.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        return res.status(404).json({ error: '客服不存在' });
      }

      // 查询该客服的聊天列表
      const chatListItems = await prisma.chatListItem.findMany({
        where: {
          agentId: agentId,
        },
        orderBy: {
          lastTimestamp: 'desc'
        }
      });

      // 转换为前端需要的格式，并获取每个对话的部分消息
      const chatList = await Promise.all(chatListItems.map(async item => {
        // 获取该对话的最新10条消息
        const messages = await prisma.message.findMany({
          where: {
            conversationId: item.conversationId
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 10
        });

        // 获取该客服的离线消息列表（用于过滤）
        const offlineMessages = await prisma.offlineMessage.findMany({
          where: {
            conversationId: item.conversationId,
            isDelivered: false
          },
          select: {
            msgId: true
          }
        });

        // 创建离线消息ID的集合，用于快速查找
        const offlineMsgIdSet = new Set(offlineMessages.map(msg => msg.msgId));

        // 转换消息格式，并过滤掉存在于离线消息表中的消息
        const formattedMessages = messages
          .filter(msg => !offlineMsgIdSet.has(msg.msgId))
          .map(msg => ({
            contentBody: msg.contentBody,
            contentType: msg.contentType,
            conversationId: msg.conversationId,
            msgId: msg.msgId,
            msgStatus: msg.msgStatus,
            recipientType: msg.recipientType,
            recipientId: msg.recipientId,
            senderId: msg.senderId,
            senderType: msg.senderType,
            timestamp: msg.timestamp.getTime()
          }));

        // 获取客户画像
        const customerProfile = await generateCustomerProfile(prisma, item.customerId);

        return {
          id: item.customerId,
          firstName: item.customerFirstName,
          lastName: item.customerLastName,
          avatar: item.customerAvatar,
          isOnline: item.isOnline,
          lastMessage: item.lastMessage,
          lastTimestamp: item.lastTimestamp?.getTime() || 0,
          hadRead: item.hadRead,
          isActive: item.isActive,
          unreadMessageCount: item.unreadMessageCount,
          conversationId: item.conversationId,
          messages: formattedMessages.reverse(), // 按时间正序排列
          customerProfile // 添加客户画像信息
        };
      }));

      res.json({ chatList });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 搜索客户
  app.get('/customers/search', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { keyword } = req.query;

      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ error: '缺少搜索关键词' });
      }

      // 获取客服信息
      const agent = await prisma.staffProfile.findFirst();
      if (!agent) {
        return res.status(404).json({ error: '客服不存在' });
      }

      // 获取商店信息
      const shop = await prisma.shop.findFirst();
      if (!shop) {
        return res.status(404).json({ error: '商店不存在' });
      }

      // 搜索客户（支持姓名和邮箱搜索）
      const customers = await prisma.customers.findMany({
        where: {
          shop_id: shop.id,
          OR: [
            {
              first_name: {
                contains: keyword,
                mode: 'insensitive'
              }
            },
            {
              last_name: {
                contains: keyword,
                mode: 'insensitive'
              }
            },
            {
              email: {
                contains: keyword,
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          image_url: true,
          phone: true
        },
        take: 10 // 限制返回数量
      });

      // 将BigInt转换为字符串，避免JSON.stringify序列化错误
      const serializedCustomers = customers.map(customer => ({
        ...customer,
        id: customer.id.toString()
      }));

      res.json({
        success: true,
        customers: serializedCustomers
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 添加客户到聊天列表
  app.post('/chatList/add', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { agentId, customerId } = req.body;

      if (!agentId || !customerId) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // 检查客服是否存在
      const agent = await prisma.staffProfile.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        return res.status(404).json({ error: '客服不存在' });
      }

      // 检查客户是否存在
      const customer = await prisma.customers.findUnique({
        where: { id: BigInt(customerId) }
      });

      if (!customer) {
        return res.status(404).json({ error: '客户不存在' });
      }

      // 检查是否已存在该客户的聊天列表项
      const existingChat = await prisma.chatListItem.findFirst({
        where: {
          agentId: agentId,
          customerId: customerId
        }
      });

      if (existingChat) {
        // 如果已存在，激活该对话
        await prisma.chatListItem.updateMany({
          where: { agentId },
          data: { isActive: false }
        });

        await prisma.chatListItem.update({
          where: { id: existingChat.id },
          data: {
            isActive: true,
            lastTimestamp: new Date()
          }
        });

        // 获取更新后的聊天列表
        const updatedChatList = await prisma.chatListItem.findMany({
          where: { agentId: agentId },
          orderBy: { lastTimestamp: 'desc' }
        });

        return res.json({
          success: true,
          conversationId: existingChat.conversationId,
          chatList: updatedChatList,
          message: '对话已激活'
        });
      }

      // 创建新的对话
      const conversation = await prisma.conversation.create({
        data: {
          shop_id: customer.shop_id || '',
          customer: customerId.toString(),
          status: 'ACTIVE'
        }
      });

      // 创建聊天列表项
      const chatListItem = await prisma.chatListItem.create({
        data: {
          conversationId: conversation.id,
          customerId: customerId.toString(),
          customerFirstName: customer.first_name || '',
          customerLastName: customer.last_name || '',
          customerAvatar: customer.image_url || '/assets/default_avatar.jpg',
          agentId: agentId,
          isActive: true,
          lastTimestamp: new Date(),
          shop: customer.shop_id || ''
        }
      });

      // 将其他对话设置为非激活状态
      await prisma.chatListItem.updateMany({
        where: {
          agentId: agentId,
          id: { not: chatListItem.id }
        },
        data: { isActive: false }
      });

      // 获取更新后的聊天列表
      const updatedChatList = await prisma.chatListItem.findMany({
        where: { agentId: agentId },
        orderBy: { lastTimestamp: 'desc' }
      });

      res.json({
        success: true,
        conversationId: conversation.id,
        chatList: updatedChatList,
        message: '已添加到聊天列表'
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 获取客服设置
  app.get('/agent/settings', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { staffProfileId } = req.query;

      if (!staffProfileId || typeof staffProfileId !== 'string') {
        return res.status(400).json({ error: '缺少staffProfileId参数' });
      }

      // 检查客服是否存在
      const staff = await prisma.staffProfile.findUnique({
        where: { id: staffProfileId },
        include: {
          agentSettings: true
        }
      });

      if (!staff) {
        return res.status(404).json({ error: '客服不存在' });
      }

      // 如果没有设置，返回默认值
      if (!staff.agentSettings) {
        const defaultSettings = {
          theme: 'light',
          emailNotifications: true,
          pushNotifications: true,
          soundEnabled: true,
          notificationSound: 'default',
          autoReplyEnabled: true,
          autoReplyMessage: '',
          autoReplyDelay: 30,
          workHoursEnabled: true,
          workStartHour: '09:00',
          workEndHour: '18:00',
          workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          typingIndicator: true,
          readReceipts: true,
          maxChatHistory: 30
        };

        return res.json({
          success: true,
          settings: defaultSettings
        });
      }

      res.json({
        success: true,
        settings: staff.agentSettings
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 更新客服设置
  app.post('/agent/settings/update', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {
        staffProfileId,
        theme,
        emailNotifications,
        pushNotifications,
        soundEnabled,
        notificationSound,
        autoReplyEnabled,
        autoReplyMessage,
        autoReplyDelay,
        workHoursEnabled,
        workStartHour,
        workEndHour,
        workDays,
        typingIndicator,
        readReceipts,
        maxChatHistory
      } = req.body;

      if (!staffProfileId) {
        return res.status(400).json({ error: '缺少staffProfileId参数' });
      }

      // 检查客服是否存在
      const staff = await prisma.staffProfile.findUnique({
        where: { id: staffProfileId }
      });

      if (!staff) {
        return res.status(404).json({ error: '客服不存在' });
      }

      // 更新或创建设置
      const settings = await prisma.agentSettings.upsert({
        where: { staffProfileId },
        update: {
          theme,
          emailNotifications,
          pushNotifications,
          soundEnabled,
          notificationSound,
          autoReplyEnabled,
          autoReplyMessage,
          autoReplyDelay,
          workHoursEnabled,
          workStartHour,
          workEndHour,
          workDays,
          typingIndicator,
          readReceipts,
          maxChatHistory
        },
        create: {
          staffProfileId,
          shop_id: staff.shop_id,
          theme: theme || 'light',
          emailNotifications: emailNotifications ?? true,
          pushNotifications: pushNotifications ?? true,
          soundEnabled: soundEnabled ?? true,
          notificationSound: notificationSound || 'default',
          autoReplyEnabled: autoReplyEnabled ?? true,
          autoReplyMessage: autoReplyMessage || '',
          autoReplyDelay: autoReplyDelay || 30,
          workHoursEnabled: workHoursEnabled ?? true,
          workStartHour: workStartHour || '09:00',
          workEndHour: workEndHour || '18:00',
          workDays: workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          typingIndicator: typingIndicator ?? true,
          readReceipts: readReceipts ?? true,
          maxChatHistory: maxChatHistory || 30
        }
      });

      res.json({
        success: true,
        settings,
        message: '设置已保存'
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 获取订单列表
  app.post('/orders', RATE_LIMITS.NORMAL, async (req, res) => {
    try {

      const { shopDomain, page = 1, limit = 50 } = req.body;
      let id = undefined
      let needSync = false
      let syncCount = 0
      const shopRedis = await redis.hgetall(`shop:installed:${shopDomain}`);
      if(!shopRedis){
        const shopPrisma = await prisma.shop.findUnique({
          where:{
            shopify_domain:shopDomain
          }
        })
        id = shopPrisma?.id
      }
      else{
        id = shopRedis.id
      }

      // 获取Shopify API客户端
      const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shopDomain);

      // 获取商店所有订单ID
      let allShopifyOrderIds: string[] = [];
      let afterCursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const result = await shopifyApiClient.ordersIds(250, afterCursor);
        allShopifyOrderIds = [...allShopifyOrderIds, ...result.orders.nodes.map(node => node.id)];
        hasMore = result.orders.pageInfo.hasNextPage;
        afterCursor = result.orders.pageInfo.endCursor;
      }

      // 获取本地数据库中的订单ID
      const localOrders = await prisma.order.findMany({
        select: {
          shopifyOrderId: true
        }
      });

       const localOrderIds = new Set(localOrders.map(order => order.shopifyOrderId));

      // 找出缺失的订单ID
      const missingOrderIds = allShopifyOrderIds.filter(shopifyOrderId => !localOrderIds.has(shopifyOrderId));

      // 同步缺失的订单数据
      if (missingOrderIds.length > 0) {
        await beginLogger({
          level:'info',
          message:`发现 ${missingOrderIds.length} 个缺失的订单，开始同步...`,
          meta:{
            type:'order_need_sync',
          }
        })
        needSync = true
        // 分批获取缺失的订单数据
        const batchSize = 50;
        for (let i = 0; i < missingOrderIds.length; i += batchSize) {
          const batch = missingOrderIds.slice(i, i + batchSize);

          try {
            // 获取这批订单的完整数据
            const ordersToSync: any[] = [];

            for (const orderId of batch) {
              try {
                const orderResult = await shopifyApiClient.order(orderId);
                ordersToSync.push(orderResult.order);
              } catch (error) {
                console.error(`获取订单 ${orderId} 失败:`, error);
              }
            }

            if (ordersToSync.length > 0) {
              await shopifyHandleResponseData(ordersToSync, 'orders', prisma, ordersToSync.length,id);
              syncCount += ordersToSync.length
            }

            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`同步订单批次 ${i}-${i + batchSize} 失败:`, error);
          }
        }
      }

      const returnOrder =async ()=>{
        // 获取该商店的订单数据（分页）
        const skip = (page - 1) * limit;
        const orders = await prisma.order.findMany({
          where: {
            customers: {
              shop_id: id
            },
            customerId: {
              not: null
            }
          },
          skip,
          include: {
            customers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                image_url: true
              }
            },
            lineItems: {
              select: {
                id: true,
                title: true,
                quantity: true,
                sku: true,
                originalUnitPrice: true,
                price: true,
                variantTitle: true
              }
            },
            shippingAddress: true,
            shipments: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        });

        // 格式化订单数据
        const formattedOrders = orders.map(order => ({
          id: order.id,
          orderNumber: order.name,
          processedAt: order.processedAt || order.createdAt,
          financialStatus: order.fullyPaid ? 'PAID' : (order.unpaid ? 'PENDING' : 'PARTIALLY_PAID'),
          totalPriceSet: {
            shopMoney: {
              amount: order.totalPrice.toString(),
              currencyCode: order.currencyCode
            }
          },
          customer: order.customers ? {
            id: order.customers.id.toString(),
            firstName: order.customers.first_name || '',
            lastName: order.customers.last_name || '',
            email: order.customers.email || '',
            displayName: `${order.customers.last_name || ''} ${order.customers.first_name || ''}`.trim() || order.customers.email
          } : null,
          fulfillments: order.shipments.map(shipment => ({
            id: shipment.id,
            status: shipment.status,
            trackingInfo: {
              company: shipment.carrier,
              number: shipment.trackingNumber,
              url: shipment.trackingUrl
            },
            createdAt: shipment.createdAt
          })),
          lineItems: order.lineItems.map(item => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            variant: {
              id: item.id,
              title: item.variantTitle || '',
              price: item.price.toString()
            }
          }))
        }));

        // 获取订单总数
        const totalCount = await prisma.order.count({
          where: {
            customers: {
              shop_id: id
            }
          }
        });

        res.json({
          data: formattedOrders,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        });
      }
      if (!needSync || syncCount) await returnOrder();
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '获取订单失败' });
    }
  });

  // 订单发货
  app.post('/orders/fulfill', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { orderId, carrier, warehouseAddress, notifyCustomer, parcelTemplateToken, customerStaffId } = req.body;
      const { shop } = req.query;

      // 1. 基础参数校验
      if (!orderId || !parcelTemplateToken || !shop) {
        return res.status(400).json({ result: false, message: "bad request,missing params" });
      }

      // 2. 检查本地是否已履约（避免重复调用）
      const existingShipment = await prisma.shipment.findFirst({
        where: { orderId },
        select: { id: true }
      });
      if (existingShipment) {
        return res.status(400).json({
          result: false,
          message: "该订单已生成运单，无需重复操作"
        });
      }

      // 3. 获取订单基础信息
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      if (!order || !order.shopifyOrderId) {
        return res.status(404).json({ result: false, message: "Order not found or missing shopifyOrderId" });
      }

      // 4. 将发货任务放入异步队列
      const jobId = await addOrderFulfillmentJob({
        orderId,
        carrier,
        warehouseAddress,
        notifyCustomer,
        parcelTemplateToken,
        shop: shop as string,
        customerStaffId
      });

      // 5. 立即返回成功响应
      return res.status(200).json({
        result: true,
        message: '订单发货请求已提交，正在处理中',
        jobId: jobId
      });

    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      console.error('订单发货流程总错误:', error);
      return res.status(500).json({
        result: false,
        error: '订单发货失败',
        message: error.message
      });
    }
  });


  app.get('/orders/carriers', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { shopDomain } = req.query;

      if (!shopDomain) {
        return res.status(400).json({ result: false, message: "Shop domain is required" });
      }

      // 导入 Shippo 客户端管理器
      const { shippoClientManager } = await import('../plugins/shippoClient.ts');

      // 检查 Shippo 服务是否已初始化
      if (!shippoClientManager.isInitialized()) {
        return res.status(500).json({ result: false, message: "Shippo service not initialized" });
      }

      // 获取全局 Shippo 服务实例
      const shippoService = shippoClientManager.getShippoService();

      // 获取承运商列表
      const carriers = await shippoService.getCarriers();

      // 获取商店信息，包括仓库地址
      const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shopDomain as string);
      const {locations} = await shopifyApiClient.shopLocations();

      // 准备仓库地址数据
      const warehouseAddress = locations?.nodes

      res.json({
        result: true,
        message: '获取承运商列表和仓库地址成功',
        data: {
          carriers,
          warehouseAddress
        }
      });
    } catch (error) {
      handleApiError(req, error);
      res.status(500).json({ result: false, message: '获取承运商列表和仓库地址失败', error: error.message });
    }
  });

  app.get('/orders/parcel-templates', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { carrier } = req.query;

      if (!carrier) {
        return res.status(400).json({ result: false, message: "Carrier is required" });
      }

      // 导入 Shippo 客户端管理器
      const { shippoClientManager } = await import('../plugins/shippoClient.ts');

      // 检查 Shippo 服务是否已初始化
      if (!shippoClientManager.isInitialized()) {
        return res.status(500).json({ result: false, message: "Shippo service not initialized" });
      }

      // 获取全局 Shippo 服务实例
      const shippoService = shippoClientManager.getShippoService();

      // 获取指定承运商的包裹模板数据
      const parcelTemplates = await shippoService.getCarrierParcelPackages(carrier as string);

      res.json({
        result: true,
        message: '获取包裹模板数据成功',
        data: parcelTemplates
      });
    } catch (error) {
      handleApiError(req, error);
      res.status(500).json({ result: false, message: '获取包裹模板数据失败', error: error.message });
    }
  });

  app.post('/orders/tracking', RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const { trackingNumber, carrier } = req.body;

      if (!trackingNumber) {
        return res.status(400).json({ result: false, message: "Tracking number is required" });
      }

      // 导入 Shippo 客户端管理器
      const { shippoClientManager } = await import('../plugins/shippoClient.ts');

      // 检查 Shippo 服务是否已初始化
      if (!shippoClientManager.isInitialized()) {
        return res.status(500).json({ result: false, message: "Shippo service not initialized" });
      }

      // 获取全局 Shippo 服务实例
      const shippoService = shippoClientManager.getShippoService();

      const trackingInfo = await shippoService.trackShipment(trackingNumber, carrier);
      console.log(trackingInfo)
      res.json({
        result: true,
        message: '获取物流信息成功',
        data: {
          carrier: carrier || 'Unknown',
          trackingNumber: trackingInfo.tracking_number,
          trackingStatus: trackingInfo.tracking_status,
          eta: trackingInfo.eta,
          trackingHistory: trackingInfo.tracking_history?.map((event: any) => ({
            status: event.status,
            statusDetails: event.status_detail,
            location: `${event.location?.city || ''}, ${event.location?.state || ''} ${event.location?.zip || ''}`,
            datetime: event.status_date
          })) || []
        }
      });
    } catch (error) {
      handleApiError(req, error);
      res.status(500).json({ result: false, message: '获取物流信息失败', error: error.message });
    }
  });

  // 卸载应用，清理商店数据
  app.post('/uninstall', RATE_LIMITS.STRICT,async (req, res) => {
    try {
      const { shopDomain } = req.body;

      if(await validateRequestSender(req)){
        return res.status(200).json({ result: false, message: 'Unauthorized' });
      }

      if (!shopDomain) {
        return res.status(200).json({ result: false, message: 'shopDomain is required' });
      }

      // 记录卸载开始日志
      await beginLogger({
        level: 'info',
        message: `开始卸载商店: ${shopDomain}`,
        meta: {
          taskType: 'uninstall_app',
          shop: shopDomain
        }
      });

      //清除对应shopifyApiClient缓存，防止重新安装后使用旧的凭证发送shopify请求
      shopifyApiClientsManager.clearClientCache(shopDomain)
      // 将数据清理任务提交到队列
      const jobId = await addShopDataCleanupJob(shopDomain);

      res.json({
        result: true,
        message: '商店数据清理任务已创建',
        jobId: jobId
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(200).json({
        result: false,
        message: '创建数据清理任务失败'
      });
    }
  });
}
