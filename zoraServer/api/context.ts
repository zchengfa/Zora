import type {Express} from "express-serve-static-core";
import type Redis from "ioredis";
import type {PrismaClient} from "@prisma/client";
import type {IShopifyApiClientsManager} from "../../plugins/shopifyUtils.ts";

export interface ZoraApiType {
  app: Express;
  redis: Redis;
  prisma: PrismaClient;
  shopifyApiClientsManager: IShopifyApiClientsManager;
  redlock?: unknown;
}
