import type { Express } from "express-serve-static-core"
import {validateMail} from "../plugins/validateMail.ts";
import Redis from "ioredis";

const redis = new Redis();

export function zoraApi(app: Express){
  app.post('/auth', (req, res) => {
    console.log(req.body,'/auth')
    res.send("Hello World")
  })

  app.post('/checkEmail',(req,res)=>{
    //const {email} = req.body
    //检查数据库是否有该邮箱（暂时全默认为没有，数据库还未设计）
    res.send({isExist:false})

  })

  app.post('/sendVerifyCodeToEmail',async (req,res)=>{
     const {email} = req.body
     const expired = 300
     try {
       const data = await validateMail({email,expired})
       //发送成功保存到redis中，并设置60秒过期时间
       await redis.setex(`${email}_verify_code`,expired,data.code)
       res.send({email_send_success:true,code_expired:expired})
     }
     catch (error) {
       res.send({email_service_err: true})
     }

  })
}
