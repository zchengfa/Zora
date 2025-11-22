import nodemailer from 'nodemailer'
import type SMTPPool from "nodemailer/lib/smtp-pool/index.d.ts";
import * as process from "node:process";
import {generateEmailHtml} from "../plugins/emailHtml.ts";

export interface ValidateConfigType {
  email:string,
  subject?:string,
  content?:string,
  code?:string,
  expired?:number
}

export interface MailResultType {
  result: SMTPPool.SentMessageInfo
  code: string
}

/**
 * 发送验证码给指定邮箱
 * @param email {string} 邮箱接收者
 * @param subject {string} 邮件标题
 * @param content {string} 邮件内容
 * @param code {string} 邮箱验证码，默认由该函数生成
 * @param expired {string} 验证码过期时间，默认为60秒
 * @return {Promise} 返回一个Promise
 * @example 使用示例：
 * validateMail({email:'xxx@qq.com'}).then(res=>{}).catch(err=>{})
 */
export function validateMail ({ email, subject, content, code, expired }:ValidateConfigType): Promise<MailResultType> {
  const config: SMTPPool.Options = {
    pool:true,
    host:process.env.MAILER_HOST,
    port:Number(process.env.MAILER_PORT),
    secure:true,
    auth: {
      user:process.env.MAILER_USER,
      pass:process.env.MAILER_PASS
    }
  }

  const smtpTransport = nodemailer.createTransport(config)

  const string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

  const generateVerifyCode = ()=> {
    const stringArr = string.split('')

    let randomString = ''
    //创建循环，随机生成一个与letterArray长度一致字符串
    for (let i = 0; i<=5; i++) {
      const randomNumber = parseInt((Math.random()*stringArr.length).toString())

      randomString += stringArr[randomNumber]
    }
    return randomString
  }

  const verifyCodeExpired = expired !== undefined ? expired : 60
  const defaultSub = 'Zora email verification'
  const verifyCode = generateVerifyCode()
  const html = generateEmailHtml(code ? code : verifyCode,expired ? expired : verifyCodeExpired,subject ? subject : defaultSub)


  return new Promise((resolve, reject)=>{
    smtpTransport.sendMail({
      from:config?.auth?.user,
      to:email,
      subject: subject || defaultSub,
      html: content || html
    }).then((res:SMTPPool.SentMessageInfo)=>{
      resolve({
        result: res,
        code:code ? code : verifyCode
      })
    }).catch(err=>{
      reject(err)
    })
  })
}
