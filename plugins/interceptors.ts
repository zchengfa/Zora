import type {NextFunction,Request,Response} from "express";
import {verifyTokenAsync} from "./token.ts";

const interceptors = async ({req,res,next}:{req:Request,res:Response,next:NextFunction})=>{
  const path = req.path
  const publicRoutes = ['/validateToken','/checkEmail','/sendVerifyCodeToEmail','/verifyCode','/authenticator']
  const token = req.headers.authorization?.split(' ')[1]  as string
  try{
    if (publicRoutes.includes(path)) {
      return next()
    }
    else {
      if (!token) {
        return res.status(401).send({result:false,message: 'Authentication token missing'})
      }
      try{
        await verifyTokenAsync(token)
        return next()
      }
      catch (err){
        return res.status(401).send({result:false,message: 'Token expired or invalid'})
      }
    }
  }
  catch (e){
    return res.status(500).send({result:false,message:"Server Error"})
  }
}

export default interceptors;
