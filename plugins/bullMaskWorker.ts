import {Worker} from "bullmq";
import {redisClient} from "./redisClient.ts";
import {currentFileName} from "./handleZoraError.ts";
import {ShopifyApiClientsManager} from "./shopifyUtils.ts";
import {prismaClient} from "./prismaClient.ts";
import {logger} from "./logger.ts";

const shopifyApiClientManager = new ShopifyApiClientsManager({redis:redisClient,prisma:prismaClient});

const getShopifyData = async (shop:string,type:string,limit:number,afterCursor?:string)=>{
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop);
  if(type === 'customers'){
    const customersResult = await shopifyApiClient.customers(limit,afterCursor)
    const {hasNextPage,endCursor} = customersResult.customers.pageInfo
    afterCursor = endCursor
    if(hasNextPage && endCursor){
      await getShopifyData(shop,type,limit,afterCursor)
      await new Promise(resolve=>{setTimeout(resolve,200)})
    }
    return customersResult
  }
}

const  worker = new Worker('shopifySyncDataQueue',async (job)=>{
  const {jobType,shop} = job.data
  const shopifyApiClient = await shopifyApiClientManager.getShopifyApiClient(shop)
  let jobTypeDataCount = 0
  logger.info(`${currentFileName(import.meta.url,true)}开始处理任务：${job.id},任务类型：${jobType}`)
  if(jobType === 'customers'){
    const {customersCount} = await shopifyApiClient.customerCount();
    jobTypeDataCount = customersCount.count;
  }
  else if(jobType === 'orders'){
    const {ordersCount} = await shopifyApiClient.ordersCount()
    jobTypeDataCount = ordersCount.count;
  }
  const limit = jobTypeDataCount > 250 ? 250 : jobTypeDataCount;
  await getShopifyData(shop,jobType,limit)
  logger.info(`${currentFileName(import.meta.url,true)}检测到任务类型：${jobType}，总数据量：${jobTypeDataCount}条`)
},{
  connection: redisClient,
  concurrency: 3
})

worker.on('completed', (job) => {
  logger.info(`${currentFileName(import.meta.url,true)}Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  logger.error(`${currentFileName(import.meta.url)}Job ${job?.id} failed with reason:`, err.message);
});

worker.on('error', (err) => {
  logger.error(`${currentFileName(import.meta.url)}Worker encountered an error:`, err);
});
