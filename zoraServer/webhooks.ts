import type {Router,Express} from "express";
import express from "express";
import type {Redis} from "ioredis";
import type {Request, Response} from "express";
import type {PrismaClient} from "@prisma/client";
import {validateWebhookHmac} from "../plugins/validate.ts";

export const webhooks = ({app,router,redis,prisma}:{app:Express,router:Router,redis:Redis,prisma:PrismaClient})=>{
  router.post('/orders/create',(req:Request,res:Response)=>{
    if(validateWebhookHmac(req)){
      res.status(200).json('OK')
    }
    else{
      res.status(401).json({error:'invalid request'})
    }

  })

  app.use('/webhooks',express.raw({type:'application/json'}),router)
}
