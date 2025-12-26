import type {NextFunction,Request,Response} from "express";
import {verifyTokenAsync} from "./token.ts";
import {validateShopifyRequest} from "./validate.ts";


const interceptors = async ({req,res,next}:{req:Request,res:Response,next:NextFunction})=>{
  const path = req.path
  const publicRoutes = ['/app','/shopifyApiClientInit','/validateToken','/checkEmail','/sendVerifyCodeToEmail','/verifyCode','/authenticator']
  const token = req.headers.authorization?.split(' ')[1]  as string
  try{
    if (publicRoutes.includes(path)) {
      return next()
    }
    else {

      if (!token) {
        const {shop,hmac,locale,embedded,session,host,id_token,timestamp } = req.query
        const shopifyRequestValidate = validateShopifyRequest({shop,hmac,locale,embedded,session,host,id_token,timestamp })
        if(req.query.hmac && !shopifyRequestValidate.result){
          return res.status(401).send({result:shopifyRequestValidate.result,message:shopifyRequestValidate.message})
        }
        else if(!req.query.hmac){
          return res.status(401).send({result:false,message: 'Authentication token missing'})
        }
        else {
          next()
        }
      }
      else{
        try{
          await verifyTokenAsync(token)
          return next()
        }
        catch (err){
          return res.status(401).send({result:false,message: 'Token expired or invalid'})
        }
      }
    }
  }
  catch (e){
    return res.status(500).send({result:false,message:"Server Error"})
  }
}

export default interceptors;
