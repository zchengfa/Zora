import {addOrderFulfillmentJob, beginLogger} from "../../plugins/bullTaskQueue.ts";
import {shopifyHandleResponseData} from "../../plugins/shopifyUtils.ts";
import {handleApiError, handlePrismaError} from "../../plugins/handleZoraError.ts";
import {RATE_LIMITS} from "./shared.ts";
import type {ZoraApiType} from "./context.ts";

export function registerOrdersRoutes({app, redis, prisma, shopifyApiClientsManager}: ZoraApiType) {
  app.post("/orders", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {shopDomain, page = 1, limit = 50} = req.body;
      let id = undefined;
      let needSync = false;
      let syncCount = 0;
      const shopRedis = await redis.hgetall(`shop:installed:${shopDomain}`);
      if (!shopRedis || Object.keys(shopRedis).length === 0) {
        const shopPrisma = await prisma.shop.findUnique({
          where: {
            shopify_domain: shopDomain,
          },
        });
        id = shopPrisma?.id;
      } else {
        id = shopRedis.id;
      }

      const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shopDomain);

      let allShopifyOrderIds: string[] = [];
      let afterCursor: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await shopifyApiClient.ordersIds(250, afterCursor);
        allShopifyOrderIds = [...allShopifyOrderIds, ...result.orders.nodes.map((node) => node.id)];
        hasMore = result.orders.pageInfo.hasNextPage;
        afterCursor = result.orders.pageInfo.endCursor || undefined;
      }

      const localOrders = await prisma.order.findMany({
        select: {
          shopifyOrderId: true,
        },
      });

      const localOrderIds = new Set(localOrders.map((order) => order.shopifyOrderId));
      const missingOrderIds = allShopifyOrderIds.filter((shopifyOrderId) => !localOrderIds.has(shopifyOrderId));

      if (missingOrderIds.length > 0) {
        await beginLogger({
          level: "info",
          message: `发现 ${missingOrderIds.length} 个缺失的订单，开始同步...`,
          meta: {
            type: "order_need_sync",
          },
        });
        needSync = true;
        const batchSize = 50;
        for (let i = 0; i < missingOrderIds.length; i += batchSize) {
          const batch = missingOrderIds.slice(i, i + batchSize);
          try {
            const ordersToSync: any[] = [];
            for (const orderId of batch) {
              try {
                const orderResult = await shopifyApiClient.order(orderId);
                ordersToSync.push(orderResult.order);
              } catch (error) {
                console.error(`获取订单 ${orderId} 失败:`, error);
              }
            }

            if (ordersToSync.length > 0) {
              await shopifyHandleResponseData(ordersToSync, "orders", prisma, ordersToSync.length, id);
              syncCount += ordersToSync.length;
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`同步订单批次 ${i}-${i + batchSize} 失败:`, error);
          }
        }
      }

      const returnOrder = async () => {
        const skip = (page - 1) * limit;
        const orders = await prisma.order.findMany({
          where: {
            customers: {
              shop_id: id,
            },
            customerId: {
              not: null,
            },
          },
          skip,
          include: {
            customers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                image_url: true,
              },
            },
            lineItems: {
              select: {
                id: true,
                title: true,
                quantity: true,
                sku: true,
                originalUnitPrice: true,
                price: true,
                variantTitle: true,
              },
            },
            shippingAddress: true,
            shipments: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        });

        const formattedOrders = orders.map((order) => ({
          id: order.id,
          orderNumber: order.name,
          processedAt: order.processedAt || order.createdAt,
          financialStatus: order.fullyPaid ? "PAID" : order.unpaid ? "PENDING" : "PARTIALLY_PAID",
          totalPriceSet: {
            shopMoney: {
              amount: order.totalPrice.toString(),
              currencyCode: order.currencyCode,
            },
          },
          customer: order.customers
            ? {
                id: order.customers.id.toString(),
                firstName: order.customers.first_name || "",
                lastName: order.customers.last_name || "",
                email: order.customers.email || "",
                displayName: `${order.customers.last_name || ""} ${order.customers.first_name || ""}`.trim() || order.customers.email,
              }
            : null,
          fulfillments: order.shipments.map((shipment) => ({
            id: shipment.id,
            status: shipment.status,
            trackingInfo: {
              company: shipment.carrier,
              number: shipment.trackingNumber,
              url: shipment.trackingUrl,
            },
            createdAt: shipment.createdAt,
          })),
          lineItems: order.lineItems.map((item) => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            variant: {
              id: item.id,
              title: item.variantTitle || "",
              price: item.price.toString(),
            },
          })),
        }));

        const totalCount = await prisma.order.count({
          where: {
            customers: {
              shop_id: id,
            },
          },
        });

        res.json({
          data: formattedOrders,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        });
      };
      if (!needSync || syncCount) await returnOrder();
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      res.status(500).json({error: "获取订单失败"});
    }
  });

  app.post("/orders/fulfill", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {orderId, carrier, objectId, warehouseAddress, notifyCustomer, parcelTemplateToken, customerStaffId} = req.body;
      const {shop} = req.query;

      if (!orderId || !parcelTemplateToken || !shop) {
        return res.status(400).json({result: false, message: "bad request,missing params"});
      }

      const existingShipment = await prisma.shipment.findFirst({
        where: {orderId},
        select: {id: true},
      });
      if (existingShipment) {
        return res.status(400).json({
          result: false,
          message: "该订单已生成运单，无需重复操作",
        });
      }

      const order = await prisma.order.findUnique({
        where: {id: orderId},
      });
      if (!order || !order.shopifyOrderId) {
        return res.status(404).json({result: false, message: "Order not found or missing shopifyOrderId"});
      }

      const jobId = await addOrderFulfillmentJob({
        orderId,
        carrier,
        objectId,
        warehouseAddress,
        notifyCustomer,
        parcelTemplateToken,
        shop: shop as string,
        customerStaffId,
      });

      return res.status(200).json({
        result: true,
        message: "订单发货请求已提交，正在处理中",
        jobId: jobId,
      });
    } catch (error) {
      handleApiError(req, error);
      handlePrismaError(error);
      console.error("订单发货流程总错误:", error);
      return res.status(500).json({
        result: false,
        error: "订单发货失败",
        message: (error as Error).message,
      });
    }
  });

  app.get("/orders/carriers", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {shopDomain} = req.query;

      if (!shopDomain) {
        return res.status(400).json({result: false, message: "Shop domain is required"});
      }

      const {shippoClientManager} = await import("../../plugins/shippoClient.ts");

      if (!shippoClientManager.isInitialized()) {
        return res.status(500).json({result: false, message: "Shippo service not initialized"});
      }

      const shippoService = shippoClientManager.getShippoService();
      const carriers = await shippoService.getCarriers();
      const shopifyApiClient = await shopifyApiClientsManager.getShopifyApiClient(shopDomain as string);
      const {locations} = await shopifyApiClient.shopLocations();
      const warehouseAddress = locations?.nodes;

      res.json({
        result: true,
        message: "获取承运商列表和仓库地址成功",
        data: {
          carriers,
          warehouseAddress,
        },
      });
    } catch (error) {
      handleApiError(req, error);
      res.status(500).json({result: false, message: "获取承运商列表和仓库地址失败", error: (error as Error).message});
    }
  });

  app.get("/orders/parcel-templates", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {carrier} = req.query;

      if (!carrier) {
        return res.status(400).json({result: false, message: "Carrier is required"});
      }

      const {shippoClientManager} = await import("../../plugins/shippoClient.ts");

      if (!shippoClientManager.isInitialized()) {
        return res.status(500).json({result: false, message: "Shippo service not initialized"});
      }

      const shippoService = shippoClientManager.getShippoService();
      const parcelTemplates = await shippoService.getCarrierParcelPackages(carrier as string);

      res.json({
        result: true,
        message: "获取包裹模板数据成功",
        data: parcelTemplates,
      });
    } catch (error) {
      handleApiError(req, error);
      res.status(500).json({result: false, message: "获取包裹模板数据失败", error: (error as Error).message});
    }
  });

  app.post("/orders/tracking", RATE_LIMITS.NORMAL, async (req, res) => {
    try {
      const {trackingNumber, carrier} = req.body;

      if (!trackingNumber) {
        return res.status(400).json({result: false, message: "Tracking number is required"});
      }

      const {shippoClientManager} = await import("../../plugins/shippoClient.ts");

      if (!shippoClientManager.isInitialized()) {
        return res.status(500).json({result: false, message: "Shippo service not initialized"});
      }

      const shippoService = shippoClientManager.getShippoService();

      const trackingInfo = await shippoService.trackShipment(trackingNumber, carrier);
      console.log(trackingInfo);
      res.json({
        result: true,
        message: "获取物流信息成功",
        data: {
          carrier: carrier || "Unknown",
          trackingNumber: trackingInfo.trackingNumber,
          trackingStatus: trackingInfo.trackingStatus,
          eta: trackingInfo.eta,
          trackingHistory:
            trackingInfo.trackingHistory?.map((event: any) => ({
              status: event.status,
              statusDetails: event.status_detail,
              location: `${event.location?.city || ""}, ${event.location?.state || ""} ${event.location?.zip || ""}`,
              datetime: event.status_date,
            })) || [],
        },
      });
    } catch (error) {
      handleApiError(req, error);
      res.status(500).json({result: false, message: "获取物流信息失败", error: (error as Error).message});
    }
  });
}
