import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  hooks:{
    //应用安装完成，同步店铺数据
    afterAuth: async ({ session }) => {
      const { shop } = session;

      console.log(`🎯 应用安装完成，开始为店铺 ${shop} 同步客户数据功能待开发`);

      // try{
      //   const utils = new ShopifyUtils(session)
      //   utils.syncShopifyData().then(res=>{
      //     console.log(res)
      //   })
      // }
      // catch (e){
      //   console.error(e);
      // }

      // 异步执行同步，不阻塞OAuth流程的重定向
      // syncShopifyCustomers(shop, accessToken).catch(error => {
      //   console.error(`❌ ${shop} 初始同步失败:`, error);
      //   // 生产环境中应集成错误上报系统
      // });
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
