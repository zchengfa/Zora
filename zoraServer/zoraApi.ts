import type {Express, Response} from "express-serve-static-core"
import {validate} from "../plugins/validate.ts";
import rateLimiter from 'express-rate-limit'
import Redis from "ioredis";
import type {PrismaClient} from "@prisma/client";
import bcrypt from 'bcrypt';
import {handlePrismaError} from "../plugins/handleZoraError.ts";
import {v4 as uuidv4} from "uuid";
import {createToken, verifyTokenAsync} from "../plugins/token.ts";
import {ShopifyApiClient} from "../plugins/shopifyUtils.ts";

interface ZoraApiType {
  app:Express,
  redis: Redis,
  prisma: PrismaClient,
  shopifyApiClients: Map<string,any>
}

interface FormDataType {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  marketEmail: boolean,
  marketSMS: boolean,
  id?: bigint,
  shopDomain?:string
}

const REDIS_EMAIL_APPEND = '_verify_code'
const REDIS_ATTEMPT_KEY = '_attempt_count'
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

const pwdCompare = async (paramsObj:FormDataType,databasePwd:string,res:Response,redis:Redis,prisma:PrismaClient,shopifyApiClients:any)=>{
  try{
    const result = await bcrypt.compare(paramsObj.password,databasePwd)
    if(result){
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
      let shopifyApiClient = shopifyApiClients.get(paramsObj.shopDomain)
      //若之前没有shopify api 请求客户端就需要重新实例化一个
      if(!shopifyApiClient){
        //redis获取商店的认证所需数据
        const redisSession = await redis.hget(`session:${paramsObj.shopDomain}`,'accessToken')
        if(!redisSession){
          //redis中没获取到，就从数据库中获取
          const prismaSession = await prisma.session.findFirst({
            where:{
              shop: paramsObj.shopDomain
            }
          })
          if(prismaSession){
            //将获取到的更新到redis
            await redis.hset(`session:${paramsObj.shopDomain}`,{...prismaSession})
            await redis.expire(`session:${paramsObj.shopDomain}`,SESSION_EXPIRED_DURATION / 7)
            //使用认证数据实例化shopify api client
            shopifyApiClient = new ShopifyApiClient({shop:paramsObj.shopDomain as string,accessToken:prismaSession.accessToken as string})
          }
        }
        else{
          shopifyApiClient = new ShopifyApiClient({shop:paramsObj.shopDomain as string,accessToken:redisSession as string})
        }
        //保存shopify api client到shopifyApiClients
        shopifyApiClients.set(paramsObj.shopDomain,shopifyApiClient)
      }
      try{
        const {shop} = await shopifyApiClient.shopOwner()
        agentInfo = await prisma.customerServiceStaff.findUnique({
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
        console.log(e)
      }

      const token = createToken({session_id},'1d')
      const username = sessionPrismaUpsert.firstName as string + sessionPrismaUpsert.lastName as string
      res.status(200).send({result:true,message:'login successfully',token,userInfo:{userId:paramsObj.id?.toString(),username,avatar:paramsObj.image_url,agentInfo}})
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

const loginFunction = async ({redis,prisma,paramsObj,res,shopifyApiClients}:{redis:Redis,prisma:PrismaClient,paramsObj:FormDataType,res:Response,shopifyApiClients:any})=>{
  try{
    //查询该用户的密码进行比对
    const redisPwdQuery = await redis.hget(`customer:${paramsObj.email}`,'password')
    //是否命中
    if(redisPwdQuery){
      await pwdCompare(paramsObj,redisPwdQuery,res,redis,prisma,shopifyApiClients)
    }
    else{
      const prismaPwdQuery = await prisma.customers.findUnique({
        where:{
          email:paramsObj.email
        }
      })

      await redis.hset(`customer:${paramsObj.email}`, {...prismaPwdQuery})
      await redis.expire(`customer:${paramsObj.email}`,24 * 60 * 60)
      await pwdCompare(paramsObj,prismaPwdQuery.password,res,redis,prisma,shopifyApiClients)
    }
  }
  catch (e) {
    res.status(500).send({result:false,message:"Server Error"})
  }
}

export function zoraApi({app,redis,prisma,shopifyApiClients}:ZoraApiType) {
  app.post('/authenticator', RATE_LIMITS.STRICT,async (req, res) => {
    const paramsObj = req.body
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
        await loginFunction({redis,prisma,paramsObj,res,shopifyApiClients})
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
          await loginFunction({redis,prisma,paramsObj,res,shopifyApiClients})
        }
        else{
          //都未命中，执行注册后再执行登录
          const newCustomer = await prisma.customers.create({
            data:{
              shopify_customer_id:new Date().getTime().toString(),
              email: paramsObj.email,
              first_name: paramsObj.firstName,
              last_name: paramsObj.lastName,
              password: await bcrypt.hash(paramsObj.password, 10),
              market_email: paramsObj.marketEmail,
              market_sms: paramsObj.marketSMS,
              verified_email: true,
              image_url: process.env.USER_DEFAULT_AVATAR
            }
          })
          //数据写入成功，执行一次redis写入
          if(newCustomer){
            await redis.hset(`customer:${newCustomer.id}`, {...newCustomer})
            await redis.expire(`customer:${newCustomer.id}`,24 * 60 * 60)
            //执行登录
            paramsObj.id = newCustomer.id
            paramsObj.image_url = newCustomer.image_url
            await loginFunction({redis,prisma,paramsObj,res,shopifyApiClients})
          }
        }
      }
    }
    catch (e){
      handlePrismaError(e)
      res.status(500).send({result:false,message:"Server Error"})
    }
  })
  app.post('/validateToken',async (req, res)=>{
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).send({result:false,message: 'Authentication token missing'})
    }
    try{
      await verifyTokenAsync(token)
      res.status(200).send({result:true,message:'logged in'})
    }
    catch (err){
      return res.status(401).send({result:false,message: 'Token expired or invalid'})
    }
  })
  app.post('/checkEmail',RATE_LIMITS.NORMAL,async (req,res)=>{
    const {email} = req.body
    //检查数据库是否有该邮箱
    try{
      const redisEmailQuery = await redis.hexists(`customer:${email}`,'email')
      //是否命中
      if(redisEmailQuery){
        res.status(200).send({result:true,message:"Email already exists"})
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
          res.status(200).send({result:true,message:"Email already exists"})
        }
        else{
          res.status(200).send({result:false,message:"Email available"})
        }
      }
    }
    catch (e){
      res.status(500).send({result:false,message:"Server Error"})
    }
  })

  app.post('/sendVerifyCodeToEmail',RATE_LIMITS.STRICT,async (req,res)=>{
     const {email} = req.body
     try {
       const data = await validate({email,expired:EXPIRED})
       //发送成功保存验证码到redis中，并设置过期时间，并清除之前验证的次数，防止用户在验证次数时间未过期时重新获取验证码却还是提示验证次数过多
       await redis.multi()
           .setex(getRedisStorageKey(email),EXPIRED,data.code)
           .setex(getRedisStorageKey(email,REDIS_ATTEMPT_KEY),EXPIRED,0)
           .exec()
       res.status(200).send({success:true,code_expired:EXPIRED,message:'code send successfully'})
     }
     catch (error) {
       res.status(500).send({server_error: true,message:'server error'})
     }

  })

    app.post('/verifyCode', RATE_LIMITS.LOOSE,async (req, res) => {
        const {code,email} = req.body

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

            const redisEx = await redis.get(email+REDIS_EMAIL_APPEND)
            if(redisEx){
                if(redisEx === code){
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
        catch (error) {
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
        res.status(500).send({server_error: true,message:'server error'})
      }

    })

  app.post('/shopifyCustomerStaffInit',async (req, res) => {
    const {email,shopOwnerName} = req.body
    if(!email || !shopOwnerName){
      return res.status(400).json({errMsg:'missing required parameters'})
    }
    try{
      const prismaSelect = {
        id: true,
        email: true,
        avatarUrl: true,
        name: true,
      }
      const prismaQuery = await prisma.customerServiceStaff.findUnique({
        where:{
          email:email,
        },
        select:prismaSelect
      })
      if(!prismaQuery){
        const prismaCreate = await prisma.customerServiceStaff.create({
          data:{
            name: shopOwnerName,
            email: email,
            avatarUrl: process.env.AGENT_DEFAULT_AVATAR,
          },
          select:prismaSelect
        })
        return res.json(prismaCreate)
      }
      res.json(prismaQuery)
    }
    catch (e) {
      res.status(500).json({errMsg:'server error'})
    }

  })
}
