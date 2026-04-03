import {Worker} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {ShopifyApiClientsManager, shopifyHandleResponseData} from "./shopifyUtils.ts";
import {prismaClient} from "./prismaClient.ts";
import {beginLogger} from "./bullTaskQueue.ts";
import {WorkerHealth} from "./workerHealth.ts";
import {Decimal} from "@prisma/client/runtime/library";
import Redlock from 'redlock';
import {shippoClientManager} from "./shippoClient.ts";

const workerHealth = new WorkerHealth({
  connection: redisClient,
  workerName: process.env.SHOPIFY_WORKER_HEALTH_KEY || 'shopify'
})

// 初始化 Redlock
const redlock = new Redlock([redisClient], {
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200
});

// 全局独立订阅客户端（只初始化一次，避免重复创建）
const subscriber = redisClient.duplicate();
// 存储已订阅的店铺（防止重复订阅）
const subscribedShops = new Set<string>();

const subscriberRedis = async (shop:string)=>{
  const channelName = `shopify:token:${shop}`;
  //该店铺订阅过就返回，防止重复订阅
  if (subscribedShops.has(shop)) return;
  try {

    await subscriber.subscribe(channelName);
    subscribedShops.add(shop);

    const messageHandler = async (recvChannel, message) => {
      if (recvChannel === channelName) {
        try {
          const channelMessage = JSON.parse(message);
          if(channelMessage.type === 'clear_shopify_api_client_old'){
            await beginLogger({
              level:'info',
              message:`🔔 收到清除旧客户端消息: ${channelName}`,
              meta:{
                type:'clear_shopify_api_client',
              }
            })
            shopifyApiClientManager.clearClientCache(shop);
          }
        } catch (parseErr) {
          console.error(`❌ 解析${shop}的Redis消息失败:`, parseErr);
        }
      }
    };

    // 5. 绑定监听（先移除旧监听，防止重复）
    subscriber.off('message', messageHandler);
    subscriber.on('message', messageHandler);

  } catch (err) {
    await beginLogger({
      level:'info',
      message:`❌ 订阅Redis频道${channelName}失败`,
      meta:{
        type:'clear_shopify_api_client',
        err
      }
    })
    return;
  }
}

await workerHealth.registerWorker()

// 初始化 Shippo 客户端
const shippoApiKey = process.env.SHIPPO_API_KEY;
if (shippoApiKey) {
  shippoClientManager.initialize(shippoApiKey);
} else {
  console.warn('SHIPPO_API_KEY not found in environment variables. Shippo functionality will be disabled.');
}

const shopifyApiClientManager = new ShopifyApiClientsManager({redis:redisClient,prisma:prismaClient});

const getShopifyData = async ({shop,limit,afterCursor,maxChunks = 50,type,totalCount,shopId = null}:{shop:string,type:'customers' | 'orders' | 'products' | 'shop',totalCount:number,limit:number,afterCursor?:string,maxChunks?:number,shopId?:string | null})=>{
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  let hasMore = false;
  let chunks:any[] = []
  if(type === 'customers'){
    const customersResult = await shopifyApiClient.customers(limit,afterCursor)
    chunks = customersResult.customers.nodes
    chunks.map((chunk)=>{
      chunk.shop_id = shopId
    })
    const {hasNextPage,endCursor} = customersResult.customers.pageInfo
    afterCursor = endCursor
    hasMore = hasNextPage
  }
  else if(type === 'orders'){
    const ordersResult = await shopifyApiClient.orders(limit,afterCursor)
    chunks = ordersResult.orders.nodes
    const {hasNextPage,endCursor} = ordersResult.orders.pageInfo
    afterCursor = endCursor
    hasMore = hasNextPage
  }
  else if(type === 'products'){
    const productsResult = await shopifyApiClient.products(limit,afterCursor)
    chunks = productsResult.products.nodes
    const {hasNextPage,endCursor} = productsResult.products.pageInfo
    afterCursor = endCursor
    hasMore = hasNextPage
  }
  if(chunks.length > maxChunks){
    for (let i = 0; i < chunks.length; i+= maxChunks) {
      const chunk = chunks.slice(i, i + maxChunks)
      await insertMultiData(chunk,type,totalCount,shopId)
    }
  }
  else{
   await insertMultiData(chunks,type,totalCount,shopId)
  }
  if(hasMore && afterCursor){
    await getShopifyData({shop,type,limit,afterCursor,totalCount,shopId})
    await new Promise(resolve=>{setTimeout(resolve,200)})
  }
}

// 清理商店数据的任务处理函数
const handleCleanupShopData = async (job: any) => {
  const {shopDomain} = job.data

  await beginLogger({
    level: 'info',
    message:`开始清理商店数据`,
    meta:{
      taskType: 'cleanup_shop_data',
      jobId: job.id,
      shopDomain: shopDomain
    }
  })

  const shop = await prismaClient.shop.findUnique({
    where: { shopify_domain: shopDomain },
    select: { id: true }
  });

  if (!shop) {
    console.log(`商店${shopDomain}不存在，无需清理数据`);
    return true;
  }
  const shopId = shop.id;

  try {
    // 事务1：轻量无关联数据删除
    await prismaClient.$transaction(async (tx) => {
      await Promise.all([
        // 并行删除无关联的轻量数据
        tx.session.deleteMany({ where: { shop: shopDomain } }),
        tx.conversation.deleteMany({ where: { shop_id: shopId } }),
        tx.chatListItem.deleteMany({ where: { shop: shopDomain } }),
        tx.webhookLog.deleteMany({ where: { shop: shopDomain } }),
        // 无依赖的客户/客服轻量数据
        tx.customerServiceStaff.deleteMany({ where: { shop_id: shopId } }),
        tx.agentSettings.deleteMany({ where: { shop_id: shopId } }),
        tx.staffProfile.deleteMany({ where: { shop_id: shopId } }),
        tx.customer_tags.deleteMany({ where: { shop_id: shopId } }),
        tx.customer_tag_relations.deleteMany({ where: { shop_id: shopId } })
      ]);
    });

    // 订单关联数据删除
    await prismaClient.$transaction(async (tx) => {
      const hasOrders = await tx.order.findMany({ where: { shop_id: shopId } });
      if (hasOrders) {
        await Promise.all([
          tx.orderLineItem.deleteMany({ where: { order: { shop_id: shopId } } }),
          tx.orderTaxLine.deleteMany({ where: { order: { shop_id: shopId } } }),
          tx.orderAdditionalFee.deleteMany({ where: { order: { shop_id: shopId } } }),
          tx.shipment.deleteMany({ where: { order: { shop_id: shopId } } }),
          tx.fulfillmentOrderLineItem.deleteMany({ where: { shop_id: shopId } })
        ]);
        // 最后删除订单主表（依赖关联表已删）
        await tx.fulfillmentOrder.deleteMany({ where: { order: { shop_id: shopId } } });
        await tx.order.deleteMany({ where: { shop_id: shopId } });
      }
    });

    // 事务3：核心数据删除
    await prismaClient.$transaction(async (tx) => {
      await tx.customers.deleteMany({ where: { shop_id: shopId } });
      await tx.product.deleteMany({ where: { shop_id: shopId } });
      await tx.shop.delete({ where: { id: shopId } });
    });

    // 删除 Redis 中的 session 数据
    await redisClient.del(`session:${shopDomain}`);

    await beginLogger({
      level: 'info',
      message:`商店数据清理完成`,
      meta:{
        taskType: 'cleanup_shop_data',
        jobId: job.id,
        shopDomain: shopDomain
      }
    })
    return true;

  } catch (e) {
    await beginLogger({ level: 'error', message: `清理商店${shopDomain}失败：${e.message}`,meta:{e} });
  }
};

// 检查订单是否已履约
const checkOrderAlreadyFulfilled = async (orderId: string) => {
  const existingShipment = await prismaClient.shipment.findFirst({
    where: { orderId },
    select: { id: true }
  });
  return !!existingShipment;
};

// 获取订单信息
const getOrderInfo = async (orderId: string) => {
  return prismaClient.order.findUnique({
    where: { id: orderId }
  });
};

// 从Shopify获取并同步订单收货地址
const syncOrderShippingAddress = async (order: any, shop: string) => {
  let orderWithAddress = await prismaClient.order.findUnique({
    where: { id: order.id },
    include: { shippingAddress: true }
  });

  if (!orderWithAddress || !orderWithAddress.shippingAddress) {
    const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
    const orderResult = await shopifyApiClient.order(order.shopifyOrderId);

    if (orderResult.order?.shippingAddress) {
      const addressId = `${order.id}_shipping`;
      await prismaClient.$transaction(async (tx) => {
        await tx.address.create({
          data: {
            id: addressId,
            customerId: order.customerId || null,
            name: orderResult.order.shippingAddress.name || '',
            address1: orderResult.order.shippingAddress.address1 || '',
            address2: orderResult.order.shippingAddress.address2 || '',
            city: orderResult.order.shippingAddress.city || '',
            province: orderResult.order.shippingAddress.province || '',
            country: orderResult.order.shippingAddress.countryCodeV2 || orderResult.order.shippingAddress.country || '',
            zip: orderResult.order.shippingAddress.zip || '',
            phone: orderResult.order.shippingAddress.phone || '',
            isDefault: false
          }
        });
        await tx.order.update({
          where: { id: order.id },
          data: { shippingAddressId: addressId }
        });
      });

      orderWithAddress = await prismaClient.order.findUnique({
        where: { id: order.id },
        include: { shippingAddress: true }
      });
    }
  }

  return orderWithAddress;
};

// 构建发货地址
const buildAddressFrom = (warehouseAddress?: any) => {
  return {
    name: warehouseAddress?.name || 'Default Warehouse',
    street1: warehouseAddress?.address?.address1 || '',
    street2: warehouseAddress?.address?.address2 || '',
    city: warehouseAddress?.address?.city || '',
    state: warehouseAddress?.address?.province || '',
    zip: warehouseAddress?.address?.zip || '',
    country: warehouseAddress?.address?.countryCode || '',
    phone: warehouseAddress?.address?.phone || warehouseAddress?.phone || '+1 555 555 5555',
    email: warehouseAddress?.address?.email || warehouseAddress?.email || 'warehouse@example.com'
  };
};

// 计算订单总重量
const calculateOrderWeight = async (orderId: string) => {
  const fulfillmentOrders = await prismaClient.fulfillmentOrder.findMany({
    where: { orderId },
    include: { lineItems: true }
  });

  let totalWeight = 0;
  let massUnit = 'lb';

  if (fulfillmentOrders.length > 0) {
    const firstWeightUnit = fulfillmentOrders[0].lineItems[0]?.weightUnit || 'POUND';
    const unitMap = {
      KILOGRAM: 'kg',
      GRAM: 'g',
      OUNCE: 'oz',
      POUND: 'lb'
    };
    massUnit = unitMap[firstWeightUnit] || 'lb';

    const conversion = {
      POUND: {
        KILOGRAM: 2.20462,
        GRAM: 0.00220462,
        OUNCE: 0.0625
      },
      KILOGRAM: {
        POUND: 0.453592,
        GRAM: 0.001,
        OUNCE: 0.0283495
      },
      GRAM: {
        POUND: 453.592,
        KILOGRAM: 1000,
        OUNCE: 28.3495
      },
      OUNCE: {
        POUND: 16,
        KILOGRAM: 35.274,
        GRAM: 0.035274
      }
    };

    fulfillmentOrders.forEach(fulfillmentOrder => {
      fulfillmentOrder.lineItems.forEach(lineItem => {
        const weightValue = Number(lineItem.weightValue) || 0;
        let itemWeight = weightValue;

        if (lineItem.weightUnit !== firstWeightUnit) {
          itemWeight = weightValue * (conversion[firstWeightUnit][lineItem.weightUnit] || 1);
        }
        totalWeight += itemWeight;
      });
    });
  }

  return { weight: totalWeight > 0 ? totalWeight.toString() : '1', massUnit };
};

// 创建Shippo运单
const createShippoShipment = async (params: {
  orderId: string;
  carrier: string;
  warehouseAddress?: any;
  parcelTemplateToken: string;
  shippingAddress: any;
  jobId: string;
  objectId:string;
}) => {
  const { orderId, carrier,objectId, warehouseAddress, parcelTemplateToken, shippingAddress, jobId } = params;

  try {
    const { shippoClientManager } = await import('./shippoClient.ts');
    if (!shippoClientManager.isInitialized()) {
      await beginLogger({
        level: 'error',
        message: `Shippo服务未初始化`,
        meta: {
          taskType: 'fulfill_order',
          jobId,
          orderId
        }
      });
      return null;
    }

    const shippoService = shippoClientManager.getShippoService();
    const addressFrom = buildAddressFrom(warehouseAddress);
    const parcelTemplate = await shippoService.getCarrierParcelByToken(parcelTemplateToken);
    const { weight, massUnit } = await calculateOrderWeight(orderId);

    const shipment = await shippoService.createShipment({
      addressFrom,
      addressTo: {
        name: shippingAddress.name || '',
        street1: shippingAddress.address1 || '',
        street2: shippingAddress.address2 || '',
        city: shippingAddress.city || '',
        state: shippingAddress.province || '',
        zip: shippingAddress.zip || '',
        country: shippingAddress.country || '',
        phone: shippingAddress.phone || '+1 555 555 5555'
      },
      parcels: [{
        length: parcelTemplate?.length || '10',
        width: parcelTemplate?.width || '10',
        height: parcelTemplate?.height || '10',
        distanceUnit: parcelTemplate?.distanceUnit || 'in',
        weight,
        massUnit
      }],
      carrierAccounts:[objectId]
    });

    return { shipment, parcelTemplate, shippoService };
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `订单${orderId}Shippo运单创建失败: ${error.message}`,
      meta: {
        taskType: 'fulfill_order',
        jobId,
        orderId,
        error: error.message
      }
    });
    return null;
  }
};

// 获取并筛选运费
const getAndFilterRates = async (params: {
  shipment: any;
  carrier: string;
  orderId: string;
  jobId: string;
  shippoService: any;
}) => {
  const { shipment, carrier, orderId, jobId, shippoService } = params;

  const rates = await shippoService.getRates(shipment.objectId);

  if (!rates || rates.length === 0) {
    await beginLogger({
      level: 'warning',
      message: `订单${orderId}当前地区没有可用的运费服务`,
      meta: {
        taskType: 'fulfill_order',
        jobId,
        orderId
      }
    });
    return null;
  }

  const carrierRates = rates.filter(rate => rate.provider.toLowerCase() === carrier.toLowerCase());

  if (carrierRates.length === 0) {
    await beginLogger({
      level: 'warning',
      message: `承运商${carrier}不支持订单${orderId}的地区的服务`,
      meta: {
        taskType: 'fulfill_order',
        jobId,
        orderId,
        carrier
      }
    });
    return null;
  }

  return carrierRates[0];
};

// 购买标签并创建追踪单
const purchaseLabelAndCreateTracking = async (params: {
  selectedRate: any;
  orderId: string;
  jobId: string;
  shippoService: any;
}) => {
  const { selectedRate, orderId, jobId, shippoService } = params;

  try {
    const label = await shippoService.purchaseLabel(selectedRate.objectId, `Order-${orderId}`);
    const trackingResult = await shippoService.createTracking({
      carrier: label.carrier,
      trackingNumber: label.trackingNumber,
      metadata: label.metadata
    }, label.test);

    return {
      label,
      trackingNumber: trackingResult.trackingNumber,
      trackingUrl: trackingResult.tracking_url || `${process.env.SHIPPO_BASE_TRACKING_URL_TEST}${label.carrier}/${label.trackingNumber}`
    };
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `订单${orderId}购买标签或创建追踪单失败: ${error.message}`,
      meta: {
        taskType: 'fulfill_order',
        jobId,
        orderId,
        error: error.message
      }
    });
    return null;
  }
};

// 获取Shopify履约订单
const getShopifyFulfillmentOrders = async (shop: string, shopifyOrderId: string) => {
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  const shopifyOrder = await shopifyApiClient.order(shopifyOrderId);
  return shopifyOrder.order?.fulfillmentOrders?.nodes || [];
};

// 筛选可履约的订单
const filterAvailableFulfillmentOrders = (fulfillmentOrders: any[]) => {
  return fulfillmentOrders.filter(
    fo => ['OPEN', 'PARTIALLY_FULFILLED'].includes(fo.status)
  );
};

// 移动履约订单到指定仓库
/**
 * 检查仓库库存是否足够
 */
const checkWarehouseInventory = async (params: {
  availableFulfillmentOrders: any[];
  warehouseAddress?: any;
  shopifyApiClient: any;
  orderId: string;
  shopifyOrderId: string;
  jobId: string;
}) => {
  const { availableFulfillmentOrders, warehouseAddress, shopifyApiClient, orderId, shopifyOrderId, jobId } = params;

  if (!warehouseAddress?.id) return true;

  const targetLocationId = warehouseAddress.id.toString();

  // 一次性查询订单中所有商品的库存信息
  const inventoryResult = await shopifyApiClient.orderInventory(
    shopifyOrderId,
    ['available']
  );

  if (!inventoryResult?.order?.fulfillmentOrders?.nodes) {
    await beginLogger({
      level: 'error',
      message: `订单${orderId}无法查询库存信息`,
      meta: {
        taskType: 'fulfill_order',
        jobId,
        orderId
      }
    });
    return false;
  }

  console.log('targetLocationId:', targetLocationId);

  await beginLogger({
    level: 'info',
    message: `订单${orderId}开始检查仓库库存，目标仓库:${targetLocationId}`,
    meta: {
      taskType: 'fulfill_order',
      jobId,
      orderId,
      targetLocationId,
      fulfillmentOrderCount: availableFulfillmentOrders.length,
      fulfillmentOrderIds: availableFulfillmentOrders.map(fo => fo.id)
    }
  });



  // 构建库存映射，方便后续查询
  const inventoryMap = new Map<string, number>();
  // 记录哪些商品在指定仓库有库存数据
  const hasWarehouseInventory = new Set<string>();

  for (const fo of inventoryResult.order.fulfillmentOrders.nodes) {
    for (const item of fo.lineItems.nodes) {
      if (!item.variant?.inventoryItem?.inventoryLevels?.nodes) continue;

      const variantId = item.variant.id;
      console.log('variantId:', variantId);
      console.log('inventoryLevels:', item.variant.inventoryItem.inventoryLevels.nodes);

      // 查找指定仓库的库存
      const inventoryLevel = item.variant.inventoryItem.inventoryLevels.nodes.find(
        (level: any) => {
          console.log('comparing:', level.location.id, targetLocationId);
          return level.location.id === targetLocationId;
        }
      );

      console.log('found inventoryLevel:', inventoryLevel);
      if (inventoryLevel?.quantities) {
        hasWarehouseInventory.add(variantId);
        const quantityInfo = inventoryLevel.quantities[0];
        const availableQuantity = quantityInfo?.quantity || 0;
        console.log('availableQuantity:', availableQuantity);
        inventoryMap.set(variantId, availableQuantity);
      }
    }
  }
  console.log('inventoryMap:', inventoryMap);
  console.log('availableFulfillmentOrders:', JSON.stringify(availableFulfillmentOrders, null, 2));
  // 检查每个商品的库存是否足够
  for (const fo of availableFulfillmentOrders) {
    for (const item of fo.lineItems.nodes) {
      if (!item.variant) {
        await beginLogger({
          level: 'error',
          message: `订单${orderId}商品变体信息缺失`,
          meta: {
            taskType: 'fulfill_order',
            jobId,
            orderId,
            itemId: item.id
          }
        });
        return false;
      }
      const variantId = item.variant.id;
      const requiredQuantity = item.totalQuantity;

      // 检查该商品是否在指定仓库有库存数据
      if (!hasWarehouseInventory.has(variantId)) {
        await beginLogger({
          level: 'warning',
          message: `订单${orderId}产品${variantId}不在指定仓库(${targetLocationId})销售，无法发货`,
          meta: {
            taskType: 'fulfill_order',
            jobId,
            orderId,
            variantId,
            targetLocationId,
            productName: item.variant?.title || '',
            sku: item.variant?.sku || '',
            requiredQuantity,
            availableWarehouses: item.variant?.inventoryItem?.inventoryLevels?.nodes?.map((level: any) => ({
              locationId: level.location.id,
              available: level.quantities?.[0]?.quantity || 0
            })) || []
          }
        });
        return false;
      }

      const availableQuantity = inventoryMap.get(variantId) || 0;

      if (availableQuantity < requiredQuantity) {
        await beginLogger({
          level: 'warning',
          message: `订单${orderId}产品${variantId}库存不足，需要${requiredQuantity}，可用${availableQuantity}，无法发货`,
          meta: {
            taskType: 'fulfill_order',
            jobId,
            orderId,
            variantId,
            productName: item.variant?.title || '',
            sku: item.variant?.sku || '',
            requiredQuantity,
            availableQuantity,
            targetLocationId,
            fulfillmentOrderId: fo.id,
            allWarehousesInventory: item.variant?.inventoryItem?.inventoryLevels?.nodes?.map((level: any) => ({
              locationId: level.location.id,
              available: level.quantities?.[0]?.quantity || 0
            })) || []
          }
        });
        return false;
      }
    }
  }

  await beginLogger({
    level: 'info',
    message: `订单${orderId}仓库库存检查通过，所有商品库存充足`,
    meta: {
      taskType: 'fulfill_order',
      jobId,
      orderId,
      targetLocationId,
      checkedItemsCount: inventoryMap.size,
      inventoryDetails: Array.from(inventoryMap.entries()).map(([variantId, quantity]) => ({
        variantId,
        availableQuantity: quantity
      }))
    }
  });

  return true;
};

const moveFulfillmentOrders = async (params: {
  availableFulfillmentOrders: any[];
  warehouseAddress?: any;
  shop: string;
  orderId: string;
  jobId: string;
}) => {
  const { availableFulfillmentOrders, warehouseAddress, shop, orderId, jobId } = params;

  if (!warehouseAddress?.id) return true;

  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  const targetLocationId = warehouseAddress.id.toString();

  for (const fo of availableFulfillmentOrders) {
    const currentLocationId = fo.assignedLocation.location.id?.toString() || '';
    if (currentLocationId !== targetLocationId) {
      await beginLogger({
        level: 'info',
        message: `订单${orderId}开始移动履约订单${fo.id}从仓库${currentLocationId}到目标仓库${targetLocationId}`,
        meta: {
          taskType: 'fulfill_order',
          jobId,
          orderId,
          fulfillmentOrderId: fo.id,
          currentLocationId,
          targetLocationId,
          lineItems: fo.lineItems.nodes.map(item => ({
            id: item.id,
            title: item.variant?.title || '',
            sku: item.variant?.sku || '',
            quantity: item.totalQuantity
          }))
        }
      });

      const updateFulfillmentOrderInput = {
        id: fo.id,
        fulfillmentOrderLineItems: fo.lineItems.nodes.map(item => ({
          id: item.id,
          quantity: item.totalQuantity
        })),
        newLocationId: targetLocationId
      };

      const moveResult = await shopifyApiClient.updateFulfillmentOrderLocation(updateFulfillmentOrderInput);
      if (moveResult?.fulfillmentOrderMove?.userErrors?.length > 0 || !moveResult) {
        await beginLogger({
          level: 'error',
          message: `订单${orderId}移动履约订单${fo.id}到仓库${targetLocationId}失败`,
          meta: {
            taskType: 'fulfill_order',
            jobId,
            orderId,
            fulfillmentOrderId: fo.id,
            currentLocationId,
            targetLocationId,
            errors: moveResult?.fulfillmentOrderMove?.userErrors || [],
            input: updateFulfillmentOrderInput
          }
        });
        return false;
      }

      await beginLogger({
        level: 'info',
        message: `订单${orderId}成功移动履约订单${fo.id}到目标仓库${targetLocationId}`,
        meta: {
          taskType: 'fulfill_order',
          jobId,
          orderId,
          fulfillmentOrderId: fo.id,
          targetLocationId
        }
      });
    }
  }

  return true;
};

// 创建Shopify履约
const createShopifyFulfillment = async (params: {
  shop: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  availableFulfillmentOrders: any[];
  warehouseAddress?: any;
  notifyCustomer?: boolean;
  orderId: string;
  jobId: string;
}) => {
  const { shop, carrier, trackingNumber, trackingUrl, availableFulfillmentOrders, warehouseAddress, notifyCustomer, orderId, jobId } = params;

  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  const lineItemsByFulfillmentOrder = availableFulfillmentOrders.map(fo => ({
    fulfillmentOrderId: fo.id,
    fulfillmentOrderLineItems: fo.lineItems.nodes.map(item => ({
      id: item.id,
      quantity: item.totalQuantity
    }))
  }));

  await beginLogger({
    level: 'info',
    message: `订单${orderId}开始创建Shopify履约，承运商:${carrier}，追踪号:${trackingNumber}`,
    meta: {
      taskType: 'fulfill_order',
      jobId,
      orderId,
      carrier,
      trackingNumber,
      trackingUrl,
      notifyCustomer,
      fulfillmentOrderCount: availableFulfillmentOrders.length,
      fulfillmentOrderIds: availableFulfillmentOrders.map(fo => fo.id),
      lineItems: availableFulfillmentOrders.flatMap(fo => fo.lineItems.nodes.map(item => ({
        fulfillmentOrderId: fo.id,
        itemId: item.id,
        title: item.variant?.title || '',
        sku: item.variant?.sku || '',
        quantity: item.totalQuantity
      })))
    }
  });

  const fulfillmentResult = await shopifyApiClient.fulfillmentCreate({
    trackingInfo: {
      company: carrier,
      numbers: [trackingNumber],
      urls: [trackingUrl]
    },
    notifyCustomer: notifyCustomer !== false,
    lineItemsByFulfillmentOrder: lineItemsByFulfillmentOrder,
    originAddress: {
      address1: warehouseAddress?.address?.address1 || '',
      address2: warehouseAddress?.address?.address2 || '',
      city: warehouseAddress?.address?.city || '',
      zip: warehouseAddress?.address?.zip || '',
      provinceCode: warehouseAddress?.address?.province || '',
      countryCode: warehouseAddress?.address?.countryCode || 'US'
    }
  });

  if (fulfillmentResult?.fulfillmentCreate?.userErrors?.length > 0) {
    await beginLogger({
      level: 'error',
      message: `订单${orderId}Shopify履约失败，承运商:${carrier}，追踪号:${trackingNumber}`,
      meta: {
        taskType: 'fulfill_order',
        jobId,
        orderId,
        carrier,
        trackingNumber,
        trackingUrl,
        errors: fulfillmentResult.fulfillmentCreate.userErrors,
        fulfillmentOrderIds: availableFulfillmentOrders.map(fo => fo.id),
        originAddress: warehouseAddress?.address
      }
    });
    return null;
  }

  await beginLogger({
    level: 'info',
    message: `订单${orderId}Shopify履约成功，履约ID:${fulfillmentResult?.fulfillmentCreate?.fulfillment?.id}，状态:${fulfillmentResult?.fulfillmentCreate?.fulfillment?.status}`,
    meta: {
      taskType: 'fulfill_order',
      jobId,
      orderId,
      fulfillmentId: fulfillmentResult?.fulfillmentCreate?.fulfillment?.id,
      fulfillmentStatus: fulfillmentResult?.fulfillmentCreate?.fulfillment?.status,
      trackingNumber,
      trackingUrl
    }
  });

  return fulfillmentResult;
};

// 保存运单记录到本地
const saveShipmentRecord = async (params: {
  order: any;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
  label?: any;
  shipment?: any;
  parcelTemplate?: any;
  selectedRate?: any;
  trackingResult?: any;
  massUnit: string;
  fulfillmentStatus: string;
}) => {
  const { order, trackingNumber, carrier, trackingUrl, label, shipment, parcelTemplate, selectedRate, trackingResult, massUnit, fulfillmentStatus } = params;

  await prismaClient.shipment.create({
    data: {
      orderId: order.id,
      trackingNumber,
      carrier,
      status: fulfillmentStatus,
      labelUrl: label?.labelUrl || '',
      trackingUrl,
      shippoShipmentId: shipment?.objectId || '',
      shippoLabelId: label?.objectId || '',
      weight: new Decimal(selectedRate?.estimatedWeight?.value || '1'),
      length: new Decimal(parcelTemplate?.length || '10'),
      width: new Decimal(parcelTemplate?.width || '10'),
      height: new Decimal(parcelTemplate?.height || '10'),
      distanceUnit: selectedRate?.estimatedWeight?.unit || 'in',
      massUnit,
      test: label?.test || true,
      eta: trackingResult?.eta || null,
      original_eta: trackingResult?.originalEta || null
    }
  });
};

// 更新订单处理时间
const updateOrderProcessedTime = async (orderId: string) => {
  await prismaClient.order.update({
    where: { id: orderId },
    data: { processedAt: new Date() }
  });
};

// 处理订单发货的任务函数
const handleFulfillOrder = async (job: any) => {
  const {orderId, carrier, objectId, warehouseAddress, notifyCustomer, parcelTemplateToken, shop, customerStaffId} = job.data;

  await beginLogger({
    level: 'info',
    message: `开始处理订单发货任务`,
    meta: {
      taskType: 'fulfill_order',
      jobId: job.id,
      orderId,
      shop
    }
  });

  // 使用 Redlock 分布式锁防止重复处理
  const lockKey = `order_fulfillment_lock:${orderId}`;
  const lockTTL = 300000; // 锁定5分钟（毫秒）
  let lock;

  try {
    // 尝试获取锁
    lock = await redlock.acquire([lockKey], lockTTL);
  } catch (error) {
    // 获取锁失败，说明订单正在被处理
    await beginLogger({
      level: 'warning',
      message: `订单${orderId}正在被其他进程处理，跳过本次处理`,
      meta: {
        taskType: 'fulfill_order',
        jobId: job.id,
        orderId
      }
    });
    return true;
  }

  try {
    // 1. 检查本地是否已履约（避免重复调用）
    const isAlreadyFulfilled = await checkOrderAlreadyFulfilled(orderId);
    if (isAlreadyFulfilled) {
      await beginLogger({
        level: 'warning',
        message: `订单${orderId}已生成运单，无需重复操作`,
        meta: {
          taskType: 'fulfill_order',
          jobId: job.id,
          orderId
        }
      });
      return true;
    }

    // 2. 获取订单基础信息
    const order = await getOrderInfo(orderId);
    if (!order || !order.shopifyOrderId) {
      await beginLogger({
        level: 'error',
        message: `订单${orderId}不存在或缺少shopifyOrderId`,
        meta: {
          taskType: 'fulfill_order',
          jobId: job.id,
          orderId
        }
      });
      return false;
    }

    // 3. 同步 Shopify 履约逻辑
    // 3.1 从 Shopify 实时获取履约订单
    const shopifyFulfillmentOrders = await getShopifyFulfillmentOrders(shop, order.shopifyOrderId);
    if (!shopifyFulfillmentOrders.length) {
      await beginLogger({
        level: 'warning',
        message: `订单${orderId}无履约订单`,
        meta: {
          taskType: 'fulfill_order',
          jobId: job.id,
          orderId
        }
      });
      return false;
    }

    // 3.2 筛选可履约的订单
    const availableFulfillmentOrders = filterAvailableFulfillmentOrders(shopifyFulfillmentOrders);
    if (!availableFulfillmentOrders.length) {
      await beginLogger({
        level: 'warning',
        message: `订单${orderId}所有履约订单已完成/取消`,
        meta: {
          taskType: 'fulfill_order',
          jobId: job.id,
          orderId
        }
      });
      return false;
    }

    // 3.3 检查仓库库存
    const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
    const inventoryCheckSuccess = await checkWarehouseInventory({
      availableFulfillmentOrders,
      warehouseAddress,
      shopifyApiClient,
      orderId,
      shopifyOrderId: order.shopifyOrderId,
      jobId: job.id
    });
    if (!inventoryCheckSuccess) {
      await beginLogger({
        level: 'warning',
        message: `订单${orderId}仓库库存不足`,
        meta: {
          taskType: 'fulfill_order',
          jobId: job.id,
          orderId
        }
      });

      // 发布库存不足消息到Redis
      await redisClient.publish('order_fulfillment', JSON.stringify({
        type: 'insufficient_inventory',
        orderId,
        shop,
        customerStaffId,
        timestamp: new Date().toISOString()
      }));

      return false;
    }

    // 4. Shippo 创建运单逻辑
    let finalTrackingNumber, finalTrackingUrl, label, shipment, parcelTemplate, selectedRate, massUnit;

    if (carrier) {
      // 4.1 获取/同步订单收货地址
      const orderWithAddress = await syncOrderShippingAddress(order, shop);
      if (!orderWithAddress || !orderWithAddress.shippingAddress) {
        await beginLogger({
          level: 'error',
          message: `订单${orderId}收货地址不存在`,
          meta: {
            taskType: 'fulfill_order',
            jobId: job.id,
            orderId
          }
        });
        return false;
      }
      const shippingAddress = orderWithAddress.shippingAddress;

      // 4.2 创建 Shippo 运单
      const shippoResult = await createShippoShipment({
        orderId,
        carrier,
        objectId,
        warehouseAddress,
        parcelTemplateToken,
        shippingAddress,
        jobId: job.id
      });
      if (!shippoResult) {
        return false;
      }
      shipment = shippoResult.shipment;
      parcelTemplate = shippoResult.parcelTemplate;
      const shippoService = shippoResult.shippoService;

      // 4.3 获取并筛选运费
      selectedRate = await getAndFilterRates({
        shipment,
        carrier,
        orderId,
        jobId: job.id,
        shippoService
      });
      if (!selectedRate) {
        return false;
      }

      // 4.4 购买标签 + 创建追踪单
      const trackingResult = await purchaseLabelAndCreateTracking({
        selectedRate,
        orderId,
        jobId: job.id,
        shippoService
      });
      if (!trackingResult) {
        return false;
      }
      finalTrackingNumber = trackingResult.trackingNumber;
      finalTrackingUrl = trackingResult.trackingUrl;
      label = trackingResult.label;

      // 获取重量单位
      const weightResult = await calculateOrderWeight(orderId);
      massUnit = weightResult.massUnit;
    }

    // 5. 移动履约订单到指定仓库
    const moveSuccess = await moveFulfillmentOrders({
      availableFulfillmentOrders,
      warehouseAddress,
      shop,
      orderId,
      jobId: job.id
    });
    if (!moveSuccess) {
      return false;
    }

    // 5.1 创建 Shopify 履约
    const fulfillmentResult = await createShopifyFulfillment({
      shop,
      carrier,
      trackingNumber: finalTrackingNumber,
      trackingUrl: finalTrackingUrl,
      availableFulfillmentOrders,
      warehouseAddress,
      notifyCustomer,
      orderId,
      jobId: job.id
    });
    if (!fulfillmentResult) {
      return false;
    }

    // 5.2 保存运单记录到本地
    await saveShipmentRecord({
      order,
      trackingNumber: finalTrackingNumber,
      carrier,
      trackingUrl: finalTrackingUrl,
      label,
      shipment,
      parcelTemplate,
      selectedRate,
      trackingResult: { eta: null, originalEta: null },
      massUnit,
      fulfillmentStatus: fulfillmentResult.fulfillmentCreate.fulfillment.status
    });

    // 5.3 更新订单处理时间
    await updateOrderProcessedTime(orderId);

    // 5.4 发布发货成功消息到Redis
    await redisClient.publish('order_fulfillment', JSON.stringify({
      type: 'fulfillment_success',
      orderId,
      shop,
      trackingNumber: finalTrackingNumber,
      trackingUrl: finalTrackingUrl,
      carrier,
      customerStaffId,
      timestamp: new Date().toISOString()
    }));

    await beginLogger({
      level: 'info',
      message: `订单${orderId}发货成功`,
      meta: {
        taskType: 'fulfill_order',
        jobId: job.id,
        orderId,
        trackingNumber: finalTrackingNumber
      }
    });

    return true;
  } catch (error) {
    await beginLogger({
      level: 'error',
      message: `订单${orderId}发货流程总错误: ${error.message}`,
      meta: {
        taskType: 'fulfill_order',
        jobId: job.id,
        orderId,
        error: error.message
      }
    });

    // 发布发货失败消息到Redis
    await redisClient.publish('order_fulfillment', JSON.stringify({
      type: 'fulfillment_failure',
      orderId,
      shop,
      customerStaffId,
      error: error.message,
      timestamp: new Date().toISOString()
    }));

    return false;
  } finally {
    // 释放分布式锁
    if (lock) {
      await lock.release().catch(err => {
        console.error(`释放订单${orderId}的分布式锁失败:`, err);
      });
    }
  }
};

// 同步 Shopify 数据的任务处理函数
const handleSyncShopifyData = async (job: any) => {
  const {jobType, shop} = job.data;
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  let shopId = null;
  let jobTypeDataCount = 0;

  // 获取商店ID，用于数据隔离
  const shopRecord = await prismaClient.shop.findUnique({
    where:{
      shopify_domain: shop
    },
    select:{
      id: true
    }
  });

  if(shopRecord){
    shopId = shopRecord.id;
  }

  if(jobType === 'customers'){
    const {customersCount} = await shopifyApiClient.customerCount();
    jobTypeDataCount = customersCount.count;
  }
  else if(jobType === 'orders'){
    const {ordersCount} = await shopifyApiClient.ordersCount();
    jobTypeDataCount = ordersCount.count;
  }
  else if(jobType === 'products'){
    const {productsCount} = await shopifyApiClient.productsCount();
    jobTypeDataCount = productsCount.count;
  }

  const limit = jobTypeDataCount > 250 ? 250 : jobTypeDataCount;

  await beginLogger({
    level: 'info',
    message:`shopify数据获取开始`,
    meta:{
      taskType: `sync_shopify_${jobType}_data`,
      jobId: job.id,
      count: jobTypeDataCount
    }
  });

  await getShopifyData({shop, type: jobType, totalCount: jobTypeDataCount, limit, shopId});
};

const worker = new Worker('shopifySyncDataQueue', async (job) => {
  const {shop} = job.data
  //强制清除，订阅兜底
  shopifyApiClientManager.clearClientCache(shop);
  //订阅消息
  await subscriberRedis(shop)
  // 处理订单发货任务
  if(job.name === 'fulfillOrder'){
    await handleFulfillOrder(job);
    return;
  }
  // 处理数据清理任务
  else if(job.name === 'cleanupShopData'){
    await handleCleanupShopData(job);
    return;
  }
  else if(job.name === 'syncShopifyData'){
    await handleSyncShopifyData(job);
  }
  },{
  connection: redisClient,
  concurrency: 3
})

worker.on('completed', async (job) => {
  await beginLogger({
    level: 'info',
    message:`shopify worker completed`,
    meta:{
      taskType: `shopify worker`,
      jobId: job.id,
      taskState: 'completed',
    }
  })
});

worker.on('failed', async (job, err) => {
  await beginLogger({
    level: 'error',
    message:`shopify worker failed`,
    meta:{
      taskType: `shopify worker`,
      jobId: job?.id,
      taskState: 'failed',
      error:{
        name: err.name,
        message: err.message,
        stack: err.stack,
      }
    }
  })
});

worker.on('error', async (err) => {
  await beginLogger({
    level: 'error',
    message:`shopify worker failed`,
    meta:{
      taskType: `shopify worker`,
      taskState: 'error',
      error:{
        name: err.name,
        message: err.message,
        stack: err.stack,
      }
    }
  })
});

// Worker 退出时关闭订阅客户端（防止连接泄漏）
worker.on('closed', async () => {
  await subscriber.quit().catch(err => console.error(`❌ 关闭订阅客户端失败:`, err));
  subscribedShops.clear(); // 清空已订阅标记
});


const shopifyWorkerHeartBeatTimer = setInterval(async ()=>{
  await workerHealth.updateWorkerHeartBeat()
},15000)

// 监听进程关闭信号，进行优雅关闭
process.on('SIGINT', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(shopifyWorkerHeartBeatTimer)
  await worker.close()
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await workerHealth.unregisterWorker()
  clearInterval(shopifyWorkerHeartBeatTimer)
  await worker.close()
  process.exit(0);
});


async function insertMultiData(data:any[],type:'customers' | 'orders' | 'products' | 'shop',totalCount:number,shopId?:string){
  await shopifyHandleResponseData(data,type,prismaClient,totalCount,shopId)
}
