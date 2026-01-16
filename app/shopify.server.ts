import "@shopify/shopify-app-react-router/adapters/node";
import {ApiVersion, AppDistribution, DeliveryMethod, shopifyApp,} from "@shopify/shopify-app-react-router/server";
import {PrismaSessionStorage} from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {shopifyApiClientInit} from "@/network/request.ts";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  webhooks:{
    ORDERS_CREATE:{
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: `${process.env.VITE_BASE_URL}/webhooks/orders/create`
    },
    CUSTOMERS_CREATE:{
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl:`${process.env.VITE_BASE_URL}/webhooks/customers/create`
    },
    CUSTOMERS_DELETE:{
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl:`${process.env.VITE_BASE_URL}/webhooks/customers/delete`
    }

  },
  hooks:{
    //应用安装完成，会触发该钩子
    afterAuth: async ({ session }) => {
      const {shop} = session
      //注册webhooks
      await shopify.registerWebhooks({session})
      //应用安装完成，告诉后端可以实例一个shopifyApiClient用作后端使用该用户的数据请求
      shopifyApiClientInit(shop).then((res)=>{
        console.log('zora应用已安装'+res.data.message)
      }).catch((err)=>{
        console.log(`Shop：${shop}已安装Zora应用，但后端服务初始化shopifyApiClient实例失败：${err}`)
      })

    },
  }
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
