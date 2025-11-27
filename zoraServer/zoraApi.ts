import type { Express,Response } from "express-serve-static-core"
import {validateMail} from "../plugins/validateMail.ts";
import rateLimiter from 'express-rate-limit'
import Redis from "ioredis";
import type {PrismaClient} from "@prisma/client";
import bcrypt from 'bcrypt';
import {handlePrismaError} from "../plugins/handleZoraError.ts";
import { v4 as uuidv4 } from "uuid";

interface ZoraApiType {
  app:Express,
  redis: Redis,
  prisma: PrismaClient,
}

interface FormDataType {
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  marketEmail: boolean,
  marketSMS: boolean,
  id?: bigint,
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

const pwdCompare = async (paramsObj:FormDataType,databasePwd:string,res:Response,redis:Redis,prisma:PrismaClient)=>{
  try{
    const result = await bcrypt.compare(paramsObj.password,databasePwd)
    if(result){
      const session_id = uuidv4()
      const expired = new Date(new Date().getTime() + SESSION_EXPIRED_DURATION)
      const sessionPrismaWrite = await prisma.session.create({
        data:{
          sessionId: session_id,
          userId: paramsObj.id,
          firstName: paramsObj.firstName,
          lastName: paramsObj.lastName,
          email: paramsObj.email,
          expires: expired,
        }
      })

      await redis.hset(`session:${paramsObj.id}`,{...sessionPrismaWrite})
      await redis.expire(`session:${paramsObj.id}`, SESSION_EXPIRED_DURATION / 1000)

      res.status(200).send({result:true,message:'login successfully',session_id})
    }
    else{
      res.status(200).send({result:false,message:'login failed with invalid credentials'})
    }
  }
  catch (e) {
    res.status(500).send({result:false,message:"Server Error"})
  }
}

const loginFunction = async ({redis,prisma,paramsObj,res}:{redis:Redis,prisma:PrismaClient,paramsObj:FormDataType,res:Response})=>{
  try{
    //查询该用户的密码进行比对
    const redisPwdQuery = await redis.hget(`customer:${paramsObj.email}`,'password')
    //是否命中
    if(redisPwdQuery){
      await pwdCompare(paramsObj,redisPwdQuery,res,redis,prisma)
    }
    else{
      const prismaPwdQuery = await prisma.customers.findUnique({
        where:{
          email:paramsObj.email
        }
      })

      await redis.hset(`customer:${paramsObj.email}`, {...prismaPwdQuery})
      await redis.expire(`customer:${paramsObj.email}`,24 * 60 * 60)
      await pwdCompare(paramsObj,prismaPwdQuery.password,res,redis,prisma)
    }
  }
  catch (e) {
    res.status(500).send({result:false,message:"Server Error"})
  }
}

export function zoraApi({app,redis,prisma}:ZoraApiType) {
  app.post('/authenticator', RATE_LIMITS.STRICT,async (req, res) => {
    const paramsObj = req.body
    console.log('密码：'+paramsObj.password)
    //先判断之前是否已经注册过了
    try{
      const redisQuery = await redis.hget(`customer:${paramsObj.email}`,'userId')
      //检查是否命中，未命中则再去数据库查询
      if(redisQuery){
        //redis命中，表示需要登录
        paramsObj.id = redisQuery
        await loginFunction({redis,prisma,paramsObj,res})
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
          await redis.hget(`customer:${paramsObj.email}`, {...prismaQuery})
          //登录
          paramsObj.id = prismaQuery.id
          await loginFunction({redis,prisma,paramsObj,res})
        }
        else{
          //都未命中，执行注册后再执行登录
          paramsObj.password = await bcrypt.hash(paramsObj.password, 10)
          const newCustomer = await prisma.customers.create({
            data:{
              shopify_customer_id:new Date().getTime().toString(),
              email: paramsObj.email,
              first_name: paramsObj.firstName,
              last_name: paramsObj.lastName,
              password: paramsObj.password,
              market_email: paramsObj.marketEmail,
              market_sms: paramsObj.marketSMS,
            }
          })
          //数据写入成功，执行一次redis写入
          if(newCustomer){
            await redis.hset(`customer:${paramsObj.email}`, {...newCustomer})
            await redis.expire(`customer:${paramsObj.email}`,24 * 60 * 60)
            //执行登录
            paramsObj.id = newCustomer.id
            await loginFunction({redis,prisma,paramsObj,res})
          }
        }
      }
    }
    catch (e){
      handlePrismaError(e)
      res.status(500).send({result:false,message:"Server Error"})
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
       const data = await validateMail({email,expired:EXPIRED})
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
}
