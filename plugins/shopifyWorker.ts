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

await workerHealth.registerWorker()

const shopifyApiClientManager = new ShopifyApiClientsManager({redis:redisClient,prisma:prismaClient});

const getShopifyData = async (shop:string,type:'customers' | 'orders' | 'products',totalCount:number,limit:number,afterCursor?:string,maxChunks = 50)=>{
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  let hasMore = false;
  let chunks:any[] = []
  if(type === 'customers'){
    const customersResult = await shopifyApiClient.customers(limit,afterCursor)
    chunks = customersResult.customers.nodes
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
      await insertMultiData(chunk,type,totalCount)
    }
  }
  else{
   await insertMultiData(chunks,type,totalCount)
  }
  if(hasMore && afterCursor){
    await getShopifyData(shop,type,limit,afterCursor)
    await new Promise(resolve=>{setTimeout(resolve,200)})
  }
}

const  worker = new Worker('shopifySyncDataQueue',async (job)=>{
  const {jobType,shop} = job.data
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop)
  let jobTypeDataCount = 0
  if(jobType === 'customers'){
    const {customersCount} = await shopifyApiClient.customerCount();
    jobTypeDataCount = customersCount.count;
  }
  else if(jobType === 'orders'){
    const {ordersCount} = await shopifyApiClient.ordersCount()
    jobTypeDataCount = ordersCount.count;
  }
  else if(jobType === 'products'){
    const {productsCount} = await shopifyApiClient.productsCount()
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
  })
  await getShopifyData(shop,jobType,jobTypeDataCount,limit)
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


async function insertMultiData(data:any[],type:'customers' | 'orders' | 'products',totalCount:number){
  await shopifyHandleResponseData(data,type,prismaClient,totalCount)
}
