import type {Router,Express} from "express";
import express from "express";
import type {Redis} from "ioredis";
import type {Request, Response} from "express";
import type {PrismaClient} from "@prisma/client";
import {validateWebhookHmac} from "../plugins/validate.ts";
import type {IShopifyApiClientsManager, IShopifyApiClient} from "../plugins/shopifyUtils.ts";
import {shopifyHandleResponseData,getWebhookParams} from "../plugins/shopifyUtils.ts";
import {handleApiError} from "../plugins/handleZoraError.ts";

export const webhooks = ({app,router,redis,prisma,shopifyApiClientsManager}:{app:Express,router:Router,redis:Redis,prisma:PrismaClient,shopifyApiClientsManager:IShopifyApiClientsManager})=>{
  router.post('/orders/create',async (req:Request,res:Response)=>{
    if(validateWebhookHmac(req)){
      res.status(200).json('OK')
      try{
        const {id,shop} = getWebhookParams(req)
        const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shop)
        const {order} = await shopifyApiClient.order(id)
        const orders = []
        orders.push(order)
        await shopifyHandleResponseData(orders,'orders',prisma)
      }
      catch (e) {
        handleApiError(req, e)
      }
    }
    else{
      res.status(401).json({error:'invalid request'})
    }

  })

  router.post('/customers/create',async (req:Request,res:Response)=>{
    if(validateWebhookHmac(req)){
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

      }
      catch (e) {
        handleApiError(req,e)
      }
    }
    else{
      res.status(401).json({error:'invalid request'})
    }
  })

  router.post('/customers/delete',async (req:Request,res:Response)=>{
    if(validateWebhookHmac(req)){
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
    }
    else{
      res.status(401).json({error:'invalid request'})
    }
  })

  app.use('/webhooks',express.raw({type:'application/json'}),router)
}
