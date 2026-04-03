import {validateRequestSender} from "../../plugins/validate.ts";
import {addShopDataCleanupJob, addShopifySyncDataJob, beginLogger} from "../../plugins/bullTaskQueue.ts";
import {handleApiError, handlePrismaError} from "../../plugins/handleZoraError.ts";
import {RATE_LIMITS, SESSION_EXPIRED_DURATION, syncShopData} from "./shared.ts";
import type {ZoraApiType} from "./context.ts";

export function registerCoreRoutes({app, redis, prisma, shopifyApiClientsManager}: ZoraApiType) {
  app.post("/shopifyApiClientInit", async (req, res) => {
    try {
      const paramsObj = req.body;
      if (!paramsObj?.shop) {
        return res.status(400).send({result: false, message: "request invalid"});
      }
      const {shop} = paramsObj;
      res.send({result: true, message: `${shop}的shopifyApiClient初始化完成，数据同步已在后台开启`});

      const prismaSession = await prisma.session.findFirst({
        where: {
          shop,
        },
      });

      await redis.hset(`session:${shop}`, {...prismaSession});
      await redis.expire(`session:${shop}`, SESSION_EXPIRED_DURATION / 7);

      await beginLogger({
        level: "info",
        message: `${shop}的shopifyApiClient初始化完成`,
        meta: {
          taskType: "zora_api",
          shop,
        },
      });

      try {
        await syncShopData(shop, prisma, shopifyApiClientsManager);
      } catch (e) {
        console.log(e);
        handlePrismaError(e);
      }

      const maskTypeArr = ["customers", "orders", "products"];
      for (const mask of maskTypeArr) {
        await addShopifySyncDataJob(mask, shop);
      }
    } catch (e) {
      handleApiError(req, e);
    }
  });

  app.get("/shopifyUserInfo", async (req, res) => {
    const {id} = req.query;
    try {
      const redisQueryCustomer = await redis.hgetall(`customer:${id}`);
      let userInfo = {};
      if (!Object.keys(redisQueryCustomer).length) {
        const prismaQueryCustomer = await prisma.customers.findUnique({
          where: {
            id: Number(id),
          },
        });
        await redis.hset(`customer:${id}`, {...prismaQueryCustomer});
        await redis.expire(`customer:${id}`, SESSION_EXPIRED_DURATION / 7);
        userInfo = {
          id: prismaQueryCustomer?.id.toString(),
          first_name: prismaQueryCustomer?.first_name,
          last_name: prismaQueryCustomer?.last_name,
          image_url: prismaQueryCustomer?.image_url,
        };
      } else {
        userInfo = {
          id: redisQueryCustomer?.id.toString(),
          first_name: redisQueryCustomer?.first_name,
          last_name: redisQueryCustomer?.last_name,
          image_url: redisQueryCustomer?.image_url,
        };
      }

      res.status(200).send({result: true, userInfo});
    } catch (e) {
      handleApiError(req, e);
      res.status(500).send({server_error: true, message: "server error"});
    }
  });

  app.post("/shopifyCustomerStaffInit", async (req, res) => {
    const {email, shopOwnerName, shopDomain} = req.body;

    if (!email || !shopOwnerName || !shopDomain) {
      return res.status(400).json({errMsg: "missing required parameters"});
    }
    try {
      let shop = await prisma.shop.findUnique({
        where: {
          shopify_domain: shopDomain,
        },
      });

      if (!shop) {
        shop = await syncShopData(shopDomain, prisma, shopifyApiClientsManager);
        if (!shop) {
          return res.status(500).json({errMsg: "failed to sync shop data"});
        }
      }

      let staffProfile = await prisma.staffProfile.findFirst({
        where: {
          email: email,
        },
      });

      if (!staffProfile) {
        staffProfile = await prisma.staffProfile.create({
          data: {
            name: shop.shop_owner_name,
            email: shop.email,
            avatarUrl: process.env.AGENT_DEFAULT_AVATAR,
            shop_id: shop.id.toString(),
          },
        });
      }

      const result = {
        id: staffProfile.id,
        email: staffProfile.email,
        avatarUrl: staffProfile.avatarUrl,
        name: staffProfile.name,
      };
      res.status(200).json(result);
    } catch (e) {
      handleApiError(req, e);
      res.status(500).json({errMsg: "server error"});
    }
  });

  app.post("/uninstall", RATE_LIMITS.STRICT, async (req, res) => {
    try {
      const {shopDomain} = req.body;

      if (await validateRequestSender(req)) {
        return res.status(200).json({result: false, message: "Unauthorized"});
      }

      if (!shopDomain) {
        return res.status(200).json({result: false, message: "shopDomain is required"});
      }

      await beginLogger({
        level: "info",
        message: `开始卸载商店: ${shopDomain}`,
        meta: {
          taskType: "uninstall_app",
          shop: shopDomain,
        },
      });

      shopifyApiClientsManager.clearClientCache(shopDomain);
      const jobId = await addShopDataCleanupJob(shopDomain);

      res.json({
        result: true,
        message: "商店数据清理任务已创建",
        jobId: jobId,
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(200).json({
        result: false,
        message: "创建数据清理任务失败",
      });
    }
  });
}
