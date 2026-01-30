import type {Express, Response} from "express-serve-static-core"
import {hashCode, RegexEmail, validate, validateHashCode, validateRequestSender} from "../plugins/validate.ts";
import rateLimiter from 'express-rate-limit'
import Redis from "ioredis";
import type {PrismaClient} from "@prisma/client";
import bcrypt from 'bcrypt';
import {handleApiError, handlePrismaError} from "../plugins/handleZoraError.ts";
import {v4 as uuidv4} from "uuid";
import {createToken, verifyTokenAsync} from "../plugins/token.ts";
import type {IShopifyApiClient, IShopifyApiClientsManager} from "../plugins/shopifyUtils.ts";
import {executeShopifyId, shopifyHandleResponseData} from "../plugins/shopifyUtils.ts";
import {addShopifySyncDataJob, beginLogger} from "../plugins/bullTaskQueue.ts";
import type {GraphqlCustomerCreateMutationResponse, GraphqlMutationVariables} from "../plugins/shopifyMutation.ts";

interface ZoraApiType {
  app:Express,
  redis: Redis,
  prisma: PrismaClient,
  shopifyApiClientsManager: IShopifyApiClientsManager,
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
      const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const shopResult = await shopifyApiClient.shop()

      try{
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
        const prismaShop = await prisma.shop.upsert({
          where:{
            shopify_domain: shop
          },
          update:data,
          create:data
        })

        if(prismaShop){
          await beginLogger({
            level: "info",
            message:`${shop}数据同步完成`,
            meta:{
              taskType: `sync_shopify_shop_data_prisma`,
              shop
            }
          })
        }
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
       const data = await validate({email,expired:EXPIRED})
       //发送成功保存验证码到redis中，并设置过期时间，并清除之前验证的次数，防止用户在验证次数时间未过期时重新获取验证码却还是提示验证次数过多
       if(!isAuth){
         await redis.multi()
           .setex(getRedisStorageKey(email),EXPIRED,hashCode(data.code))
           .setex(getRedisStorageKey(email,REDIS_ATTEMPT_KEY),EXPIRED,0)
           .exec()
       }
       else{
         await redis.multi()
           .setex(getRedisStorageKey(email,REDIS_AUTH_CODE_APPEND),EXPIRED,hashCode(data.code))
           .setex(getRedisStorageKey(email,REDIS_AUTH_ATTEMPT_KEY),EXPIRED,0)
           .exec()
       }
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
      const shop = await prisma.shop.findUnique({
        where: {
          shopify_domain: shopDomain
        }
      })

      if(!shop){
        return res.status(404).json({errMsg:'shop not found'})
      }

      // 查询商店下的所有客户
      const customers = await prisma.customers.findMany({
        where: {
          shop_id:shop.id
        }
      })

      if(!customers || customers.length === 0){
        return res.status(404).json({errMsg:'customer not found'})
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
            name: shopOwnerName,
            email: email,
            avatarUrl: process.env.AGENT_DEFAULT_AVATAR
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
          messages: formattedMessages.reverse() // 按时间正序排列
        };
      }));

      res.json({ chatList });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({ error: '服务器错误' });
    }
  });
}
