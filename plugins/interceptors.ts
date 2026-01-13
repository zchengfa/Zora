import type {NextFunction, Request, Response} from "express";
import {verifyTokenAsync} from "./token.ts";
import {validateShopifyHmacRequest, validateShopifySecretRequest} from "./validate.ts";
import type {ShopifyUrlQueryType} from './validate.ts'
import {beginLogger} from "./bullTaskQueue.ts";

//Shopify请求验证中间件
const shopifyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { shop,hmac,locale,embedded,session,host,id_token,timestamp, request_secret } = req.query;

  if (hmac) {
    const validation = validateShopifyHmacRequest({shop,hmac,locale,embedded,session,host,id_token,timestamp} as ShopifyUrlQueryType);
    if (!validation.result) {
      beginLogger({
        level: 'error',
        message: `shopify请求${req.path}验证hmac签名不通过`,
        meta:{
          taskType: 'shopify_request_auth',
          code: 401,
          validation
        }
      }).then()
      return res.status(401).send(validation);
    }
    beginLogger({
      level: 'info',
      message: `shopify请求${req.path}验证hmac签名通过,已放行`,
      meta:{
        taskType: 'shopify_request_auth',
        validation
      }
    }).then()
    return next();
  }

  if (request_secret) {
    const validation = validateShopifySecretRequest(request_secret as string, process.env.SHOPIFY_API_SECRET as string);
    if (!validation.result) {
      beginLogger({
        level: 'error',
        message: `shopify请求${req.path}验证密钥不通过`,
        meta:{
          taskType: 'shopify_request_auth',
          code: 401,
          validation
        }
      }).then()
      return res.status(401).send(validation);
    }
    beginLogger({
      level: 'info',
      message: `shopify请求${req.path}验证密钥通过,已放行`,
      meta:{
        taskType: 'shopify_request_auth',
        validation
      }
    }).then()
    return next();
  }

  // 既不是HMAC验证，也不是密钥验证，则视为无效的Shopify请求
  beginLogger({
    level: 'info',
    message: `shopify请求${req.path}为无效的shopify请求`,
    meta:{
      taskType: 'shopify_request_auth',
    }
  }).then()
  return res.status(401).send({result: false, message: 'Invalid Shopify request'});
};

// 主拦截器
const interceptors = async ({req,res,next}:{req: Request, res: Response, next: NextFunction}) => {
  const path = req.path;
  const publicRoutes = ['/app', '/shopifyApiClientInit', '/validateToken', '/checkEmail', '/sendVerifyCodeToEmail', '/verifyCode', '/authenticator'];

  // 放行公共路由和webhooks路由
  if (publicRoutes.includes(path) || req.path.startsWith('/webhooks')) {
    await beginLogger({
      level: 'info',
      message: `😊公共请求${path}已放行`,
      meta:{
        taskType: 'request_interceptors'
      }
    })
    return next();
  }

  const token = req.headers?.authorization?.split(' ')[1];

  try {
    // 优先处理Token认证（适用于普通API请求）
    if (token) {
      await verifyTokenAsync(token)
      //logger.info(`请求${path}验证token通过`)
      return next();
    }

    // 处理无Token请求（主要处理Shopify相关验证）
    shopifyAuthMiddleware(req, res, next);

  } catch (error) {
    // 统一错误处理
    //logger.error(`请求${path}验证出错:`, error);
    beginLogger({
      level: 'error',
      message: `请求${path}验证出错`,
      meta:{
        taskType: 'shopify_request_auth',
        error:{
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        }
      }
    }).then()
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).send({result: false, message: 'Token expired'});
    }
    return res.status(500).send({result: false, message: 'Server Error'});
  }
};

export default interceptors;
