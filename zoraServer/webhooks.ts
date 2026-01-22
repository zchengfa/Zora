import type {Router,Express,NextFunction,Request, Response} from "express";
import express from "express";
import type {Redis} from "ioredis";
import type {PrismaClient} from "@prisma/client";
import {validateWebhookHmac} from "../plugins/validate.ts";
import type {IShopifyApiClientsManager, IShopifyApiClient} from "../plugins/shopifyUtils.ts";
import {shopifyHandleResponseData,getWebhookParams,executeShopifyId} from "../plugins/shopifyUtils.ts";
import {handleApiError} from "../plugins/handleZoraError.ts";
import {SocketUtils} from "../plugins/socketUtils.ts";

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
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {order} = await shopifyApiClient.order(id)
      const orders = []
      orders.push(order)
      await shopifyHandleResponseData(orders,'orders',prisma)

      // 向在线客服发送订单创建通知
      await SocketUtils.sendWebhookNotification({
        webhookType: 'orders/create',
        data: order,
        shop
      })
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 订单更新webhook
  router.post('/orders/updated', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {order} = await shopifyApiClient.order(id)
      const orders = []
      orders.push(order)
      await shopifyHandleResponseData(orders,'orders',prisma)

      // 向在线客服发送订单更新通知
      await SocketUtils.sendWebhookNotification({
        webhookType: 'orders/updated',
        data: order,
        shop
      })
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 订单删除webhook
  router.post('/orders/delete', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id} = getWebhookParams(req)
      // 删除订单相关数据
      await prisma.order.deleteMany({
        where: {
          shopifyOrderId: id
        }
      })
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 客户创建webhook
  router.post('/customers/create', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
        id
      })
      let shop_id = undefined
      const redisShopId = await redis.hget(`shop:installed:${shop}`,'id')
      if(redisShopId){
        shop_id = redisShopId
      }
      else{
        const prismaShopResult = await prisma.shop.findUnique({
          where:{
            shopify_domain: shop,
          },
          select:{
            id: true
          }
        })

        shop_id = prismaShopResult?.id
      }
      const customer = JSON.parse(JSON.stringify(customerByIdentifier))
      customer.shop_id = shop_id
      const customers = []
      customers.push(customer)
      await shopifyHandleResponseData(customers,'customers',prisma)

      // 向在线客服发送客户创建通知
      await SocketUtils.sendWebhookNotification({
        webhookType: 'customers/create',
        data: customer,
        shop
      })
    }
    catch (e) {
      handleApiError(req,e)
    }
  })

  // 客户更新webhook
  router.post('/customers/update', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {customerByIdentifier} = await shopifyApiClient.customerByIdentifier({
        id
      })
      let shop_id = undefined
      const redisShopId = await redis.hget(`shop:installed:${shop}`,'id')
      if(redisShopId){
        shop_id = redisShopId
      }
      else{
        const prismaShopResult = await prisma.shop.findUnique({
          where:{
            shopify_domain: shop,
          },
          select:{
            id: true
          }
        })
        shop_id = prismaShopResult?.id
      }
      const customer = JSON.parse(JSON.stringify(customerByIdentifier))
      customer.shop_id = shop_id
      const customers = []
      customers.push(customer)
      await shopifyHandleResponseData(customers,'customers',prisma)

      // 向在线客服发送客户更新通知
      // await SocketUtils.sendWebhookNotification({
      //   webhookType: 'customers/update',
      //   data: customer,
      //   shop
      // })
    }
    catch (e) {
      handleApiError(req,e)
    }
  })

  // 客户删除webhook
  router.post('/customers/delete', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
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
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 产品创建webhook
  router.post('/products/create', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {product} = await shopifyApiClient.product(id)
      const products = []
      products.push(product)
      await shopifyHandleResponseData(products,'products',prisma)
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 产品更新webhook
  router.post('/products/update', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id,shop} = getWebhookParams(req)
      const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
      const {product} = await shopifyApiClient.product(id)
      const products = []
      products.push(product)
      await shopifyHandleResponseData(products,'products',prisma)
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 产品删除webhook
  router.post('/products/delete', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {id} = getWebhookParams(req)
      // 使用executeShopifyId从Shopify ID中提取数字ID
      const productId = executeShopifyId(id)
      await prisma.product.deleteMany({
        where: {
          id: productId
        }
      })
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  // 应用卸载webhook
  router.post('/app/uninstalled', validateWebhook, async (req:Request, res:Response) => {
    res.status(200).json('OK')
    try{
      const {shop} = getWebhookParams(req)
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
    }
    catch (e) {
      handleApiError(req, e)
    }
  })

  app.use('/webhooks', express.raw({type:'application/json'}), router)
}
