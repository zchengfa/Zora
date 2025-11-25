import type { Express } from "express-serve-static-core"
import {validateMail} from "../plugins/validateMail.ts";
import Redis from "ioredis";
import rateLimiter from 'express-rate-limit'

const redis = new Redis();
const REDIS_EMAIL_APPEND = '_verify_code'
const REDIS_ATTEMPT_KEY = '_attempt_count'
const EXPIRED = 300

const getRedisStorageKey = (target:string,append:string = REDIS_EMAIL_APPEND)=> `${target}${append}`

//限制器工厂函数
const createRateLimiter = (limit:number,windowMs:number = 60000)=>{
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

export function zoraApi(app: Express){
  app.post('/authenticator', RATE_LIMITS.STRICT,(req, res) => {
    const paramsObj = req.body.formData
    res.send({paramsObj})
  })

  app.post('/checkEmail',RATE_LIMITS.NORMAL,(req,res)=>{
    //const {email} = req.body
    //检查数据库是否有该邮箱（暂时全默认为没有，数据库还未设计）
    res.send({isExist:false})

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
