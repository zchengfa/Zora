import type {Router,Express} from "express";
import express from "express";
import type {Redis} from "ioredis";
import type {Request, Response} from "express";
import type {PrismaClient} from "@prisma/client";
import {validateWebhookHmac} from "../plugins/validate.ts";
import type {IShopifyApiClientsManager, IShopifyApiClient} from "../plugins/shopifyUtils.ts";
import {shopifyHandleResponseData} from "../plugins/shopifyUtils.ts";
import {handleApiError} from "../plugins/handleZoraError.ts";

export const webhooks = ({app,router,redis,prisma,shopifyApiClientsManager}:{app:Express,router:Router,redis:Redis,prisma:PrismaClient,shopifyApiClientsManager:IShopifyApiClientsManager})=>{
  router.post('/orders/create',async (req:Request,res:Response)=>{
    if(validateWebhookHmac(req)){
      res.status(200).json('OK')
      try{
        const {admin_graphql_api_id} = JSON.parse(req.body.toString('utf8'))
        const request_shop = req.headers['x-shopify-shop-domain']
        const shopifyApiClient:IShopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(request_shop as string)
        const {order} = await shopifyApiClient.order(admin_graphql_api_id)
        const orders = []
        orders.push(order)
        await shopifyHandleResponseData(orders,'orders',prisma)
      }
      catch (e) {
        handleApiError(req,e)
      }
    }
    else{
      res.status(401).json({error:'invalid request'})
    }

  })

  app.use('/webhooks',express.raw({type:'application/json'}),router)
}
