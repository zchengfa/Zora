import type {NextFunction,Request,Response} from "express";
import {verifyTokenAsync} from "./token.ts";

const interceptors = async ({req,res,next}:{req:Request,res:Response,next:NextFunction})=>{
  const path = req.path
  const publicRoutes = ['/validateToken','/checkEmail','/sendVerifyCodeToEmail','/verifyCode','/authenticator']
  try{
    if (publicRoutes.indexOf(path) !== -1) {
      if(path === '/validateToken'){
        const token = req.headers.authorization?.split(' ')[1]  as string
        try{
          await verifyTokenAsync(token)
          res.status(200).send({result:true,message:'logged in'})
        }
        catch (err){
          res.status(401).send({result:false,message: 'token expired'})
        }
      }
      next()
    }
  }
  catch (e){
    res.status(500).send({result:false,message:"Server Error"})
  }
}

export default interceptors;
