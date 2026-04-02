import type {Router,Express,NextFunction,Request, Response} from "express";
import express from "express";
import type {Redis} from "ioredis";
import type {PrismaClient} from "@prisma/client";
import {validateWebhookHmac} from "../plugins/validate.ts";
import type {IShopifyApiClientsManager, IShopifyApiClient} from "../plugins/shopifyUtils.ts";
import {shopifyHandleResponseData,getWebhookParams,executeShopifyId} from "../plugins/shopifyUtils.ts";
import {handleApiError} from "../plugins/handleZoraError.ts";
import {SocketUtils} from "../plugins/socketUtils.ts";
import crypto from "crypto";

interface WebhookHandlerOptions {
  prisma: PrismaClient;
  shop: string;
  webhookId: string;
  event: string;
  handler: () => Promise<void>;
}

/**
 * 生成payload的hash值
 */
function generatePayloadHash(payload: any): string {
  const payloadStr = JSON.stringify(payload);
  return crypto.createHash('sha256').update(payloadStr).digest('hex');
}

/**
 * 检查webhook是否已处理过
 */
async function checkWebhookProcessed(prisma: PrismaClient, shop: string, webhookId: string): Promise<boolean> {
  const existingLog = await prisma.webhookLog.findUnique({
    where: {
      webhookId_shop: {
        webhookId,
        shop
      }
    }
  });
  return !!existingLog;
}

/**
 * 创建webhook处理记录
 */
async function createWebhookLog(prisma: PrismaClient, shop: string, webhookId: string, event: string): Promise<void> {
  const payloadHash = generatePayloadHash({ webhookId, shop, event });
  await prisma.webhookLog.create({
    data: {
      webhookId,
      shop,
      event,
      status: 'PENDING',
      payloadHash
    }
  });
}

/**
 * 异步处理webhook业务逻辑
 */
async function processWebhookAsync(prisma: PrismaClient, shop: string, webhookId: string, event: string, handler: () => Promise<void>): Promise<void> {
  try {
    // 更新状态为处理中
    await prisma.webhookLog.updateMany({
      where: { webhookId, shop },
      data: { status: 'PROCESSING' }
    });

    // 执行业务处理逻辑
    await handler();

    // 更新状态为成功
    await prisma.webhookLog.updateMany({
      where: { webhookId, shop },
      data: { status: 'SUCCESS', processedAt: new Date() }
    });
  } catch (error) {
    // 更新状态为失败
    await prisma.webhookLog.updateMany({
      where: { webhookId, shop },
      data: {
        status: 'FAILED',
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
        retryCount: { increment: 1 }
      }
    });

    // 记录错误但不抛出，避免影响响应
    console.error(`Webhook ${webhookId} for ${shop} processing failed:`, error);
  }
}

export const webhooks = ({app,router,redis,prisma,shopifyApiClientsManager}:{app:Express,router:Router,redis:Redis,prisma:PrismaClient,shopifyApiClientsManager:IShopifyApiClientsManager})=>{
  // Webhook验证中间件
  const validateWebhook = (req:Request, res:Response, next:NextFunction) => {
    if(!validateWebhookHmac(req)){
      return res.status(401).json({error:'invalid webhook signature'})
    }
    next()
  }

  // 订单创建webhook
  router.post('/orders/create', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'orders/create');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'orders/create', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {order} = await shopifyApiClient.order(id)
      const orders = []
      orders.push(order)
      await shopifyHandleResponseData(orders,'orders',prisma,orders.length,undefined,shop,redis,shopifyApiClient)

      // 向在线客服发送订单创建通知
      await SocketUtils.sendWebhookNotification({
        webhookType: 'orders/create',
        data: order,
        shop
      })
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 订单更新webhook
  router.post('/orders/updated', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'orders/updated');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'orders/updated', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {order} = await shopifyApiClient.order(id)
      const orders = []
      orders.push(order)
      await shopifyHandleResponseData(orders,'orders',prisma,orders.length,undefined,shop,redis,shopifyApiClient)

      // 向在线客服发送订单更新通知
      await SocketUtils.sendWebhookNotification({
        webhookType: 'orders/updated',
        data: order,
        shop
      })
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 订单删除webhook
  router.post('/orders/delete', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'orders/delete');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'orders/delete', async () => {
      // 删除订单相关数据
      await prisma.order.deleteMany({
        where: {
          shopifyOrderId: id
        }
      })
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 客户创建webhook
  router.post('/customers/create', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'customers/create');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'customers/create', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
        id
      })
      const customers = []
      customers.push(customerByIdentifier)
      await shopifyHandleResponseData(customers,'customers',prisma,customers.length,undefined,shop,redis,shopifyApiClient)

      // 向在线客服发送客户创建通知
      await SocketUtils.sendWebhookNotification({
        webhookType: 'customers/create',
        data: customerByIdentifier,
        shop
      })
    }).catch((e) => {
      handleApiError(req,e)
    });
  })

  // 客户更新webhook
  router.post('/customers/update', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'customers/update');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'customers/update', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
        id
      })
      const customers = []
      customers.push(customerByIdentifier)
      await shopifyHandleResponseData(customers,'customers',prisma,customers.length,undefined,shop,redis,shopifyApiClient)

      // 向在线客服发送客户更新通知
      // await SocketUtils.sendWebhookNotification({
      //   webhookType: 'customers/update',
      //   data: customer,
      //   shop
      // })
    }).catch((e) => {
      handleApiError(req,e)
    });
  })

  // 客户删除webhook
  router.post('/customers/delete', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'customers/delete');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'customers/delete', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
        id
      })
      if(!customerByIdentifier){
        await prisma.customers.delete({
          where:{
            shopify_customer_id: id
          }
        })
      }
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 产品创建webhook
  router.post('/products/create', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'products/create');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'products/create', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {product} = await shopifyApiClient.product(id)
      const products = []
      products.push(product)
      await shopifyHandleResponseData(products,'products',prisma,products.length,undefined,shop,redis,shopifyApiClient)
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 产品更新webhook
  router.post('/products/update', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'products/update');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'products/update', async () => {
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {product} = await shopifyApiClient.product(id)
      const products = []
      products.push(product)
      await shopifyHandleResponseData(products,'products',prisma,products.length,undefined,shop,redis,shopifyApiClient)
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 产品删除webhook
  router.post('/products/delete', validateWebhook, async (req:Request, res:Response) => {
    const {id,shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'products/delete');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'products/delete', async () => {
      // 使用executeShopifyId从Shopify ID中提取数字ID
      const productId = executeShopifyId(id)
      await prisma.product.deleteMany({
        where: {
          id: productId
        }
      })
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  // 应用卸载webhook
  router.post('/app/uninstalled', validateWebhook, async (req:Request, res:Response) => {
    const {shop,webhookId} = getWebhookParams(req)

    // 检查是否已处理
    const isProcessed = await checkWebhookProcessed(prisma, shop, webhookId);

    if (isProcessed) {
      // 已处理，直接返回200
      return res.status(200).json('OK');
    }

    // 未处理，先返回200，再异步执行业务逻辑
    res.status(200).json('OK');

    // 创建webhook记录
    await createWebhookLog(prisma, shop, webhookId, 'app/uninstalled');

    // 异步执行业务逻辑
    processWebhookAsync(prisma, shop, webhookId, 'app/uninstalled', async () => {
      // 清理Redis中的会话数据
      await redis.del(`session:${shop}`)
      await redis.del(`shop:installed:${shop}`)

      // 清理Shopify API客户端缓存
      shopifyApiClientsManager.clearClientCache(shop)

      // 删除数据库shop记录
      await prisma.shop.updateMany({
        where: {
          shopify_domain: shop
        },
        data:{
          is_installed: false
        }
      })
    }).catch((e) => {
      handleApiError(req, e)
    });
  })

  app.use('/webhooks', express.raw({type:'application/json'}), router)
}
