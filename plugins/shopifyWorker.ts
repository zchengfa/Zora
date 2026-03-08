import {Worker} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {ShopifyApiClientsManager, shopifyHandleResponseData} from "./shopifyUtils.ts";
import {prismaClient} from "./prismaClient.ts";
import {beginLogger} from "./bullTaskQueue.ts";
import {WorkerHealth} from "./workerHealth.ts";

const workerHealth = new WorkerHealth({
  connection: redisClient,
  workerName: process.env.SHOPIFY_WORKER_HEALTH_KEY || 'shopify'
})
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

  // 使用事务执行删除操作
  await prismaClient.$transaction(async (tx) => {
    // 5. 获取商店信息
    const shop = await tx.shop.findUnique({
      where: { shopify_domain: shopDomain }
    });

    if(shop){
      // 1. 删除商店的 session 数据
      await tx.session.deleteMany({
        where: { shop: shopDomain }
      });

      // 2. 删除商店相关的会话数据
      await tx.conversation.deleteMany({
        where: { shop_id:shop.id }
      });

      // 3. 删除商店相关的聊天列表项
      await tx.chatListItem.deleteMany({
        where: { shop: shopDomain }
      });

      // 4. 删除商店相关的 webhook 日志
      await tx.webhookLog.deleteMany({
        where: { shop: shopDomain }
      });
      // 6. 删除商店相关的订单数据（包括关联的运单、订单行项目等）
      // 先获取该商店的所有订单
      const orders = await tx.order.findMany({
        where: { shop_id: shop.id },
        select: { id: true }
      });

      const orderIds = orders.map(o => o.id);

      // 删除这些订单的关联数据
      if(orderIds.length > 0){
        // 删除订单行项目
        await tx.orderLineItem.deleteMany({
          where: { orderId: { in: orderIds } }
        });
        // 删除订单税费
        await tx.orderTaxLine.deleteMany({
          where: { orderId: { in: orderIds } }
        });
        // 删除订单附加费用
        await tx.orderAdditionalFee.deleteMany({
          where: { orderId: { in: orderIds } }
        });
        // 删除运单
        await tx.shipment.deleteMany({
          where: { orderId: { in: orderIds } }
        });
        // 删除待履约订单
        await tx.fulfillmentOrder.deleteMany({
          where: { orderId: { in: orderIds } }
        });
        // 删除待履约订单行项目
        await tx.fulfillmentOrderLineItem.deleteMany({
          where: { shop_id: shop.id }
        });
        // 删除订单
        await tx.order.deleteMany({
          where: { id: { in: orderIds } }
        });
      }

      // 7. 删除商店相关的客户数据（包括关联的地址、客服关系等）
      await tx.customers.deleteMany({
        where: { shop_id: shop.id }
      });

      // 8. 删除商店相关的产品数据
      await tx.product.deleteMany({
        where: { shop_id: shop.id }
      });

      // 9. 删除商店相关的客服数据
      await tx.customerServiceStaff.deleteMany({
        where: { shop_id: shop.id }
      });

      // 10. 删除商店相关的客服设置
      await tx.agentSettings.deleteMany({
        where: { shop_id: shop.id }
      });

      // 11. 删除商店相关的客服资料
      await tx.staffProfile.deleteMany({
        where: { shop_id: shop.id }
      });

      // 12. 删除商店相关的标签数据
      await tx.customer_tags.deleteMany({
        where: { shop_id: shop.id }
      });

      // 13. 删除商店相关的标签关系数据
      await tx.customer_tag_relations.deleteMany({
        where: { shop_id: shop.id }
      });

      // 14. 删除商店数据
      await tx.shop.delete({
        where: { id: shop.id }
      });
    }
  });

  // 15. 删除 Redis 中的 session 数据
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
  // 处理数据清理任务
  if(job.name === 'cleanupShopData'){
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
