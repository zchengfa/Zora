import type {NextFunction, Request, Response} from "express";
import {verifyTokenAsync} from "./token.ts";
import {validateShopifyHmacRequest, validateShopifySecretRequest} from "./validate.ts";
import type {ShopifyUrlQueryType} from './validate.ts'
import {logger} from "./logger.ts";

//Shopify请求验证中间件
const shopifyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { shop,hmac,locale,embedded,session,host,id_token,timestamp, request_secret } = req.query;

  if (hmac) {
    const validation = validateShopifyHmacRequest({shop,hmac,locale,embedded,session,host,id_token,timestamp} as ShopifyUrlQueryType);
    if (!validation.result) {
      return res.status(401).send(validation);
    }
    return next();
  }

  if (request_secret) {
    const validation = validateShopifySecretRequest(request_secret as string, process.env.SHOPIFY_API_SECRET as string);
    if (!validation.result) {
      return res.status(401).send(validation);
    }
    return next();
  }

  // 既不是HMAC验证，也不是密钥验证，则视为无效的Shopify请求
  return res.status(401).send({result: false, message: 'Invalid Shopify request'});
};

// 主拦截器
const interceptors = async ({req,res,next}:{req: Request, res: Response, next: NextFunction}) => {
  const path = req.path;
  const publicRoutes = ['/app', '/shopifyApiClientInit', '/validateToken', '/checkEmail', '/sendVerifyCodeToEmail', '/verifyCode', '/authenticator'];

  // 放行公共路由和webhooks路由
  if (publicRoutes.includes(path) || req.path.startsWith('/webhooks')) {
    return next();
  }

  const token = req.headers?.authorization?.split(' ')[1];

  try {
    // 优先处理Token认证（适用于普通API请求）
    if (token) {
      await verifyTokenAsync(token);
      return next();
    }

    // 处理无Token请求（主要处理Shopify相关验证）
    shopifyAuthMiddleware(req, res, next);

  } catch (error) {
    // 统一错误处理
    logger.error(`Auth error for path ${path}:`, error); // 添加日志
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send({result: false, message: 'Token expired'});
    }
    return res.status(500).send({result: false, message: 'Server Error'});
  }
};

export default interceptors;
