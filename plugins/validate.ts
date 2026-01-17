import nodemailer from 'nodemailer'
import type SMTPPool from "nodemailer/lib/smtp-pool/index.d.ts";
import {generateEmailHtml} from "./emailHtml.ts";
import {createHmac, timingSafeEqual} from "node:crypto";
import type {Request} from "express";
import {redisClient} from "./redisClient.ts";
import {prismaClient} from "./prismaClient.ts";
import {returnStatement} from "@babel/types";

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
 * 正则校验邮箱
 * @param email {string} 需要校验的邮箱
 * @return {boolean} true || false
 * @example 使用示例：
 * RegexEmail("xxxxx@qq.com")
 */
export const RegexEmail = (email:string):boolean=> {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
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
 * validate({email:'xxx@qq.com'}).then(res=>{}).catch(err=>{})
 */
export function validate ({ email, subject, content, code, expired }:ValidateConfigType): Promise<MailResultType> {
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

export interface ShopifyUrlQueryType {
  shop:string,
  hmac:string,
  locale:string,
  embedded:string,
  session:string,
  host:string,
  id_token:string,
  timestamp:string
}

export function verifyShopifyHmac(
  params: ShopifyUrlQueryType,
  secret: string
): boolean {
  const { hmac, ...rest } = params;
  if (!hmac) return false;

  // 1) 按字典序拼接 key=value
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&');

  // 计算 HMAC-SHA256
  const expected = createHmac('sha256', secret)
    .update(message, 'utf8')
    .digest('hex');

  // 恒定时间比较，防时序攻击
  return timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(hmac, 'hex')
  );
}

function verifyTimestamp(timestamp:string, maxAgeSeconds = 300) {
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);

  // 检查时间戳是否在合理范围内（默认5分钟）
  return Math.abs(currentTime - requestTime) <= maxAgeSeconds;
}

function verifyShopDomain(shopParam:string) {
  const shopRegex = /^[a-zA-Z0-9\-]+\.myshopify\.com$/;
  return shopRegex.test(shopParam);
}

export function validateShopifyHmacRequest(query:ShopifyUrlQueryType,validateTimestamp = false) {
  const { shop, hmac, id_token, timestamp } = query;
  // 1. 验证必需参数存在
  if (!shop || !hmac || !id_token || !timestamp) {
    return {
      result:false,
      message: 'Missing required parameters'
    }
  }

  // 2. 验证HMAC
  if(process.env.SHOPIFY_API_SECRET){
    if (!verifyShopifyHmac(query, process.env.SHOPIFY_API_SECRET as string)) {
      return {
        result:false,
        message: 'Invalid HMAC signature'
      }
    }
  }
  else{
    return {
      result:false,
      message: 'Not found SHOPIFY_API_SECRET in environment variables'
    }
  }

  // 3. 验证时间戳（防重放攻击）
  if(validateTimestamp){
    if (!verifyTimestamp(timestamp)) {
      return {
        result:false,
        message: 'Invalid timestamp'
      }
    }
  }

  // 4. 验证店铺域名
  if (!verifyShopDomain(shop)) {
    return {
      result:false,
      message: 'Invalid shop domain'
    }
  }
  return {
    result:true,
    message: 'valid Shopify request'
  };
}


/**
 * 验证基于密钥的请求（适用于服务端到服务端的通信）
 * @param requestSecret 请求中提供的密钥
 * @param expectedSecret 预期的正确密钥
 * @returns 验证结果对象
 */
export function validateShopifySecretRequest(requestSecret: string, expectedSecret: string): { result: boolean; message?: string } {
  // 检查请求密钥是否存在
  if (!requestSecret) {
    return { result: false, message: 'Missing request secret' };
  }

  // 直接比较提供的密钥与预期密钥是否匹配
  const isSecretValid = requestSecret === expectedSecret;

  return {
    result: isSecretValid,
    message: isSecretValid ? 'Secret validation successful' : 'Secret validation failed'
  };
}

/**
 * 统一的Shopify请求验证函数（根据参数自动选择验证方式）
 */
export function validateShopifyRequest(params: any): { result: boolean; message?: string } {
  const { hmac, request_secret } = params;

  if (hmac) {
    return validateShopifyHmacRequest(params);
  }

  if (request_secret) {
    return validateShopifySecretRequest(request_secret, process.env.SHOPIFY_API_SECRET as string);
  }

  return { result: false, message: 'No valid authentication method provided' };
}


export function validateWebhookHmac (req:Request){
  const HMAC = req.headers['x-shopify-hmac-sha256']
  const calculateHmac = createHmac('sha256', process.env.SHOPIFY_API_SECRET as string)
    .update(req.body,'utf-8')
    .digest('base64');

  return timingSafeEqual(Buffer.from(HMAC as string),Buffer.from(calculateHmac))

}

export async function validateRequestSender(req:Request){
  const requestSender = req.headers?.origin || req.headers?.referer
  if(!requestSender) return false
  const domain = requestSender.split('//')[1]
  const redisShopDomain = await redisClient.hget(`shop:installed:${domain}`,'id')
  if(redisShopDomain) return redisShopDomain
  const prismaShopDomain = await prismaClient.shop.findUnique({where:{shopify_domain: domain}, select:{id: true}})
  return prismaShopDomain?.id;
}
