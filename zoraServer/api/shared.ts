import rateLimiter from "express-rate-limit";
import type {PrismaClient} from "@prisma/client";
import type {IShopifyApiClientsManager} from "../../plugins/shopifyUtils.ts";
import {executeShopifyId} from "../../plugins/shopifyUtils.ts";
import {beginLogger} from "../../plugins/bullTaskQueue.ts";
import {handlePrismaError} from "../../plugins/handleZoraError.ts";

export const REDIS_EMAIL_APPEND = "_verify_code";
export const REDIS_AUTH_CODE_APPEND = "_verify_auth_code";
export const REDIS_ATTEMPT_KEY = "_attempt_count";
export const REDIS_AUTH_ATTEMPT_KEY = "_auth_attempt_count";
export const EXPIRED = 300;
export const SESSION_EXPIRED_DURATION = 7 * 24 * 60 * 60 * 1000;

export const getRedisStorageKey = (target: string, append: string = REDIS_EMAIL_APPEND) => `${target}${append}`;

const createRateLimiter = (limit: number, windowMs: number = 60000) =>
  rateLimiter({
    windowMs,
    limit,
    message: "Your request is too frequent. Please try again later",
  });

export const RATE_LIMITS = {
  STRICT: createRateLimiter(3),
  NORMAL: createRateLimiter(60),
  LOOSE: createRateLimiter(300),
};

/**
 * 从Shopify API获取商店信息并同步到数据库
 */
export const syncShopData = async (
  shopDomain: string,
  prisma: PrismaClient,
  shopifyApiClientsManager: IShopifyApiClientsManager,
) => {
  try {
    const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shopDomain);
    const shopResult = await shopifyApiClient.shop();

    const data = {
      id: executeShopifyId(shopResult.shop.id),
      name: shopResult.shop.name,
      email: shopResult.shop.email,
      shop_owner_name: shopResult.shop.shopOwnerName,
      shopify_plus: shopResult.shop.plan.shopifyPlus,
      shopify_domain: shopResult.shop.myshopifyDomain,
      partner_development: shopResult.shop.plan.partnerDevelopment,
      public_display_name: shopResult.shop.plan.publicDisplayName,
      createdAt: shopResult.shop.createdAt,
      updatedAt: shopResult.shop.updatedAt,
      is_installed: true,
    };

    const shop = await prisma.shop.upsert({
      where: {
        shopify_domain: shopDomain,
      },
      update: data,
      create: data,
    });

    await beginLogger({
      level: "info",
      message: `${shopDomain}数据同步完成`,
      meta: {
        taskType: "sync_shopify_shop_data_prisma",
        shop: shopDomain,
      },
    });

    return shop;
  } catch (e) {
    console.log(e);
    handlePrismaError(e);
    return null;
  }
};
