import {ShopifyAPI} from "./axios.ts"
import {
  CUSTOMER_COUNT_QUERY,
  CUSTOMERS_QUERY,
  SHOP_QUERY,
  ORDERS_COUNT_QUERY,
  ORDERS_QUERY,
  PRODUCTS_COUNT_QUERY,
  PRODUCTS_QUERY,
  ORDER_QUERY,
  PRODUCT_QUERY,
  CUSTOMER_QUERY_BY_identifier
} from "./shopifyQuery.ts";
import type {
  GraphqlShopResponse,
  GraphqlCustomerCountResponse,
  GraphqlCustomersResponse,
  GraphqlOrdersCountResponse,
  GraphqlOrdersResponse,
  GraphqlQueryVariables,
  GraphqlProductsCountResponse,
  GraphqlProductsResponse,
  GraphqlOrderResponse,
  GraphqlProductResponse,
  GraphqlCustomerByIdentifierResponse
} from './shopifyQuery.ts'
import {CUSTOMER_CREATE_MUTATION} from './shopifyMutation.ts'
import type {
  GraphqlCustomerCreateMutationResponse,
  GraphqlMutationVariables
} from './shopifyMutation.ts'
import type {PrismaClient} from "@prisma/client";
import type {Redis} from "ioredis"
import {beginLogger} from "./bullTaskQueue.ts";
import {handlePrismaError} from "./handleZoraError.ts";
import express from "express";

export interface IShopifyApiClient {
  /**
   * 获取店铺所有者信息
   */
  shop(): Promise<GraphqlShopResponse>,

  /**
   * 查询客户信息
   */
  customers(limit:number,afterCursor?:string): Promise<GraphqlCustomersResponse>,

  /**
   * 查询客户数量
   */
  customerCount(): Promise<GraphqlCustomerCountResponse>,

  /**
   * 查询订单数量
   */
  ordersCount(): Promise<GraphqlOrdersCountResponse>,

  /**
   * 查询订单
   */
  orders(limit:number,afterCursor?:string): Promise<GraphqlOrdersResponse>,

  /**
   * 获取产品数量
   */
  productsCount(): Promise<GraphqlProductsCountResponse>,

  /**
   * 查询产品
   */
  products(limit:number,afterCursor?:string): Promise<GraphqlProductsResponse>,

  /**
   * 查询指定订单
   */
  order(orderId:string): Promise<GraphqlOrderResponse>,

  /**
   * 查询指定产品
   */
  product(productId:string): Promise<GraphqlProductResponse>,

  /**
   * 通过标识查询指定客户数据
   */
  customerByIdentifier(identifier:GraphqlQueryVariables['identifier']):Promise<GraphqlCustomerByIdentifierResponse>

  /**
   * 写入客户
   */
  customerCreate(input:GraphqlMutationVariables['input']): Promise<GraphqlCustomerCreateMutationResponse>,
}
export class ShopifyApiClient implements IShopifyApiClient {
  private readonly shopConfig: { apiVersion: string; shopDomain: string; accessToken: string };
  private shopifyApi: ShopifyAPI;
  constructor(session:{shop:string,accessToken:string}) {
    this.shopifyApi = new ShopifyAPI()
    this.shopConfig = {
      shopDomain:session.shop,
      accessToken:(session.accessToken) as string,
      apiVersion: '2025-10'
    }
  }
  private shopifyApiGraphqlRequest = (query:string,variables?:GraphqlQueryVariables | GraphqlMutationVariables)=>{
    return this.shopifyApi.graphql({
      ...this.shopConfig,
      query,
      variables:{
        ...variables
      }
    })
  }

  public shop = ():Promise<GraphqlShopResponse>=>{
    return this.shopifyApiGraphqlRequest(SHOP_QUERY)
  }

  public ordersCount = ():Promise<GraphqlOrdersCountResponse> =>{
    return this.shopifyApiGraphqlRequest(ORDERS_COUNT_QUERY)
  }

  public customerCount = ():Promise<GraphqlCustomerCountResponse>=>{
    return this.shopifyApiGraphqlRequest(CUSTOMER_COUNT_QUERY)
  }

  public customers = (limit:number,afterCursor?:string):Promise<GraphqlCustomersResponse>=>{
    return this.shopifyApiGraphqlRequest(CUSTOMERS_QUERY,{
      limit,
      afterCursor
    })
  }

  public orders = (limit:number,afterCursor?:string): Promise<GraphqlOrdersResponse> =>{
    return this.shopifyApiGraphqlRequest(ORDERS_QUERY,{
      limit,
      afterCursor
    })
  }

  public productsCount = ():Promise<GraphqlProductsCountResponse> =>{
    return this.shopifyApiGraphqlRequest(PRODUCTS_COUNT_QUERY)
  }

  public products = (limit:number,afterCursor?:string):Promise<GraphqlProductsResponse> =>{
    return this.shopifyApiGraphqlRequest(PRODUCTS_QUERY,{
      limit,
      afterCursor
    })
  }

  public order = (orderId:string):Promise<GraphqlOrderResponse> =>{
    return this.shopifyApiGraphqlRequest(ORDER_QUERY,{
      orderId
    })
  }

  public product = (productId:string):Promise<GraphqlProductResponse>=>{
    return this.shopifyApiGraphqlRequest(PRODUCT_QUERY,{
      productId
    })
  }

  public customerByIdentifier = (identifier:GraphqlQueryVariables['identifier']):Promise<GraphqlCustomerByIdentifierResponse>=>{
    return this.shopifyApiGraphqlRequest(CUSTOMER_QUERY_BY_identifier,{
      identifier
    })
  }

  public customerCreate = (input:GraphqlMutationVariables['input']):Promise<GraphqlCustomerCreateMutationResponse> =>{
    return this.shopifyApiGraphqlRequest(CUSTOMER_CREATE_MUTATION,{
      input
    })
  }
}

export interface IShopifyApiClientsManager {
  /**
   * 获取或创建Shopify API客户端
   */
  getShopifyApiClient(shopDomain: string): Promise<IShopifyApiClient>;

  /**
   * 清除指定商店的客户端缓存
   */
  clearClientCache(shopDomain: string): void;

  /**
   * 获取当前缓存的所有客户端数量
   */
  getCachedClientsCount(): number;
}


export class ShopifyApiClientsManager implements IShopifyApiClientsManager{
  private shopifyApiClients: Map<string, ShopifyApiClient> = new Map();
  private readonly SESSION_EXPIRED_DURATION: number;
  private prisma: PrismaClient;
  private redis: Redis;
  constructor({redis, prisma, sessionExpiredDuration = 7 * 24 * 3600 * 1000}:{redis:Redis,prisma:PrismaClient,sessionExpiredDuration?:number}) {
    this.redis = redis;
    this.prisma = prisma;
    this.SESSION_EXPIRED_DURATION = sessionExpiredDuration;
    this.shopifyApiClients = new Map(); // 内存缓存
  }

  /**
   * 获取或创建Shopify API客户端
   * @param {string} shopDomain - 商店域名
   * @returns {Promise<IShopifyApiClient>} Shopify API客户端实例
   */
  async getShopifyApiClient(shopDomain:string): Promise<IShopifyApiClient> {
    // 检查内存缓存
    let shopifyApiClient = this.shopifyApiClients.get(shopDomain);
    if (shopifyApiClient) {
      return shopifyApiClient;
    }

    // 获取访问令牌并创建客户端
    const accessToken = await this.getAccessToken(shopDomain);
    if (!accessToken) {
      throw new Error(`未找到商店 ${shopDomain} 的访问令牌`);
    }

    shopifyApiClient = new ShopifyApiClient({
      shop: shopDomain,
      accessToken: accessToken
    });

    // 更新内存缓存
    this.shopifyApiClients.set(shopDomain, shopifyApiClient);
    return shopifyApiClient;
  }

  /**
   * 获取访问令牌（私有方法）
   * @param {string} shopDomain - 商店域名
   * @returns {Promise<string|null>} 访问令牌
   */
  private async getAccessToken(shopDomain:string): Promise<string | null> {
    // 尝试从Redis获取
    const redisSession = await this.redis.hget(`session:${shopDomain}`, 'accessToken');
    if (redisSession) {
      return redisSession;
    }

    // 从数据库获取
    const prismaSession = await this.prisma.session.findFirst({
      where: { shop: shopDomain }
    });

    if (prismaSession && prismaSession.accessToken) {
      // 更新Redis缓存
      await this.redis.hset(`session:${shopDomain}`, { ...prismaSession });
      await this.redis.expire(`session:${shopDomain}`, this.SESSION_EXPIRED_DURATION / 7);
      return prismaSession.accessToken;
    }

    return null;
  }

  /**
   * 清除指定商店的客户端缓存
   * @param {string} shopDomain - 商店域名
   */
  clearClientCache(shopDomain:string) {
    this.shopifyApiClients.delete(shopDomain);
  }

  /**
   * 获取当前缓存的所有客户端数量（用于监控）
   * @returns {number} 缓存中的客户端数量
   */
  getCachedClientsCount(): number {
    return this.shopifyApiClients.size;
  }
}


export const executeShopifyId = (id:string)=>{
  return id.substring(id.lastIndexOf('/')+1,id.length)
}

export const getWebhookParams = (req: express.Request):{id:string,shop:string}=>{
  const {admin_graphql_api_id} = JSON.parse(req.body.toString('utf8'))
  const request_shop = req?.headers['x-shopify-shop-domain']

  return {
    id: admin_graphql_api_id,
    shop: request_shop as string,
  }
}


export const shopifyHandleResponseData = async (data:any[],type:'customers' | 'orders' | 'products' | 'shop',prismaClient:PrismaClient,totalCount:number = 1)=>{
  let result = null
  if(type === 'customers'){
    const prismaData:any[] = []

    data.map((item:GraphqlCustomersResponse['customers']['nodes'][0] & {shop_id?:string})=>{
      prismaData.push({
        id: executeShopifyId(item.id),
        shopify_customer_id: item.id,
        email: item.defaultEmailAddress.emailAddress,
        first_name: item.firstName,
        last_name: item.lastName,
        phone: item.defaultPhoneNumber,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        number_of_orders: item.numberOfOrders,
        total_amount_spent: item.amountSpent.amount,
        currency_code: item.amountSpent.currencyCode,
        verified_email: item.verifiedEmail,
        market_email: item.defaultEmailAddress.marketingState !== "NOT_SUBSCRIBED",
        shop_id: item.shop_id,
        image_url: process.env?.USER_DEFAULT_AVATAR || null
      })
    })

    try{
      result = await prismaClient.customers.createMany({
        data: prismaData,
        skipDuplicates: true
      })

      if(result.count){
        await beginLogger({
          level: 'info',
          message: `shopify ${type}数据同步成功，此次同步数据量:${result.count}条，总数据量：${totalCount}`,
          meta:{
            taskType: `sync_shopify_${type}_data_prisma`,
            count: result.count,
            totalCount,
          }
        })
      }
      else{
        await beginLogger({
          level: 'info',
          message: `shopify ${type}数据已存在数据库中无需同步，此次同步数据量:${result.count}条，总数据量：${totalCount}`,
          meta:{
            taskType: `sync_shopify_${type}_data_prisma`,
            count: result.count,
            totalCount,
          }
        })
      }
    }
    catch (e) {
      handlePrismaError(e)
    }

  }
  else if(type === 'orders'){
    const prismaOrders:Partial<Array<GraphqlOrdersResponse['orders']["nodes"][0]> & any[]> = []
    const prismaOrderTaxLines: Array<{orderId:string,title:string,rate:number,ratePercentage:number,price:number,source: string | null}> = []
    const prismaOrderLinesItem: Array<{orderId:string,title:string,variantTitle:string,sku:string,quantity:number,price:string,originalUnitPrice:string}> = []
    const prismaOrderAdditionalFees: Array<{id:string,price:string,title:string,orderId:string}> = []
    data.map((item:GraphqlOrdersResponse['orders']["nodes"][0])=>{
      prismaOrders.push({
        id: executeShopifyId(item.id),
        name: item.name,
        note: item.note,
        returnStatus: item.returnStatus,
        processedAt: item.processedAt,
        statusPageUrl: item.statusPageUrl,
        channelInformation: item.channelInformation.displayName,
        currencyCode: item.currencyCode,
        fullyPaid: item.fullyPaid,
        unpaid: item.unpaid,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        customerId: item.customer?.id || null,
        shopifyOrderId: item.id,
        confirmationNumber: item.confirmationNumber,
        totalTax: item.totalTaxSet.shopMoney.amount,
        totalReceived: item.totalReceivedSet.shopMoney.amount,
        totalShippingPrice: item.totalShippingPriceSet.shopMoney.amount,
        totalPrice: item.totalPriceSet.shopMoney.amount,
        subtotalPrice: Number(item.subtotalPriceSet.shopMoney.amount).toFixed(1).toString()
      })

      item.currentTaxLines.map((currentTaxLine)=>{
        prismaOrderTaxLines.push({
          orderId: executeShopifyId(item.id),
          title: currentTaxLine.title,
          rate: currentTaxLine.rate,
          ratePercentage: currentTaxLine.ratePercentage,
          price: Number(currentTaxLine.priceSet.shopMoney.amount),
          source: currentTaxLine.source,
        })
      })

      item.lineItems.nodes.map((lineItem)=>{
        prismaOrderLinesItem.push({
          orderId: executeShopifyId(item.id),
          title: lineItem.title,
          variantTitle: lineItem.variantTitle,
          sku: lineItem.sku,
          quantity: lineItem.quantity,
          originalUnitPrice: lineItem.originalUnitPriceSet.shopMoney.amount,
          price: lineItem.discountedUnitPriceSet.shopMoney.amount,
        })
      })

      if(item.additionalFees.length){
        item.additionalFees.map((additionalFee)=>{
          prismaOrderAdditionalFees.push({
            id: executeShopifyId(additionalFee.id),
            title: additionalFee.name,
            price: additionalFee.price.shopMoney.amount,
            orderId: executeShopifyId(item.id)
          })
        })
      }
    })

    try{
      const order = await prismaClient.order.createMany({
        data: prismaOrders,
        skipDuplicates: true
      })

      if(order.count){
        const orderTaxL = await prismaClient.orderTaxLine.createMany({
          data: prismaOrderTaxLines
        })

        const orderLI = await prismaClient.orderLineItem.createMany({
          data: prismaOrderLinesItem
        })

        const orderA = await prismaClient.orderAdditionalFee.createMany({
          data: prismaOrderAdditionalFees
        })

        await beginLogger({
          level: 'info',
          message: `shopify ${type} 数据同步成功，${type}数据总数量：${totalCount},${type}：${order.count}条,${type}_tax_lines：${orderTaxL.count}条,${type}_line_items：${orderLI.count}条,${type}_additional_fee：${orderA.count}条
        `,
          meta:{
            taskType: `sync_shopify_${type}_data_prisma`,
            totalCount,
            taxLines: orderTaxL.count,
            additionalFee: orderA.count,
            lineItems: orderLI.count,
            orders: order.count,
          }
        })
      }
      else {
        await beginLogger({
          level: 'info',
          message: `shopify ${type}数据已存在数据库，无需同步，${type}数据总数量：${totalCount},${type}无需同步：${order.count}条`,
          meta:{
            taskType: `sync_shopify_${type}_data_prisma`,
            totalCount,
            orders: order.count,
          }
        })
      }

    }
    catch (e) {
      handlePrismaError(e)
    }
  }
  else if(type === 'products'){
    const prismaProducts: Partial<GraphqlProductsResponse['products']['nodes'][0][]> = []
    const prismaProductMediaCount:Array<{productId:string,count:number}> = []
    const prismaProductMediaPreview:Array<{imageUrl:string,mediaId:string}> = []
    const prismaProductVariantCount:Array<{productId:string,count:number}> = []
    const prismaMedia:Array<{id:string,url:string,thumbhash:string,mediaContentType:string}> = []
    const prismaProductMedia:Array<{productId:string,mediaId:string}> = []
    const prismaProductVariant:Array<{ id: string, sku: string, price: string, unitPrice: string | null, currencyCode: string | null, productId: string, position: number }> = []
    const prismaProductsId:Array<{id:string,featuredMediaId: string | null}> = []

    data.map((product:GraphqlProductsResponse['products']['nodes'][0])=>{
      prismaProductsId.push({
        id: executeShopifyId(product.id),
        featuredMediaId: product.featuredMedia?.id ? executeShopifyId(product.featuredMedia.id) : null
      })
      //产品基础数据
      prismaProducts.push({
        id: executeShopifyId(product.id),
        title: product.title,
        description: product.description,
        descriptionHtml: product.descriptionHtml,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        tags: product.tags,
        vendor: product.vendor,
        minPrice: Number(product.priceRangeV2.minVariantPrice.amount),
        maxPrice: Number(product.priceRangeV2.maxVariantPrice.amount),
        minCompareAtPrice: Number(product.compareAtPriceRange?.minVariantCompareAtPrice?.amount),
        maxCompareAtPrice: Number(product.compareAtPriceRange?.maxVariantCompareAtPrice?.amount),
      })
      //media数量
      prismaProductMediaCount.push({
        productId: executeShopifyId(product.id),
        count: product.mediaCount.count
      })

      //产品variant数量
      prismaProductVariantCount.push({
        productId: executeShopifyId(product.id),
        count: product.variantsCount.count
      })

      //media preview
      product.media.nodes?.map((mediaPreview)=>{
        prismaProductMediaPreview.push({
          imageUrl: mediaPreview.preview.image.url,
          mediaId: executeShopifyId(mediaPreview.id)
        })

        prismaMedia.push({
          id: executeShopifyId(mediaPreview.id),
          url: mediaPreview.preview.image.url,
          thumbhash: mediaPreview.preview.image.thumbhash,
          mediaContentType: mediaPreview.mediaContentType
        })

        prismaProductMedia.push({
          productId: executeShopifyId(product.id),
          mediaId: executeShopifyId(mediaPreview.id),
        })
      })

      product.variants.nodes?.map((variant)=>{
        prismaProductVariant.push({
          id: executeShopifyId(variant.id),
          sku: variant.sku,
          price: variant.price,
          unitPrice: variant.unitPrice?.amount || null,
          currencyCode: variant.unitPrice?.currencyCode || null,
          productId: executeShopifyId(product.id),
          position: variant.position
        })
      })

      return prismaProducts
    })

    try{
      await prismaClient.$transaction(async (tx) => {
        // 1. 先创建主产品记录
        await tx.product.createMany({
          data: prismaProducts,
          skipDuplicates: true
        });

        // 2. 创建媒体记录（MediaPreview ）
        await tx.media.createMany({
          data: prismaMedia,
          skipDuplicates: true
        });

        // 3. 创建产品与媒体的关联关系
        await tx.productMedia.createMany({
          data: prismaProductMedia,
          skipDuplicates: true
        });

        // 4. 创建变体记录
        await tx.variant.createMany({
          data: prismaProductVariant,
          skipDuplicates: true
        });

        // 5. 最后创建 MediaPreview（它依赖 Media 表）
        await tx.mediaPreview.createMany({
          data: prismaProductMediaPreview,
          skipDuplicates: true
        });

        // 6. 创建计数记录
        await tx.productVariantCount.createMany({
          data: prismaProductVariantCount,
          skipDuplicates: true
        });

        await tx.productMediaCount.createMany({
          data: prismaProductMediaCount,
          skipDuplicates: true
        });
        //更新featuredMediaId
        const updatePromises = prismaProductsId
          .filter(item => item.featuredMediaId) // 只更新有值的
          .map(item =>
            tx.product.update({
              where: { id: item.id },
              data: { featuredMediaId: item.featuredMediaId }
            })
          );

        await Promise.all(updatePromises)

        return true;
      });

      await beginLogger({
        level: 'info',
        message: `shopify ${type} 数据同步完成，总数据量：${totalCount}条，此次同步数据：${data.length}条`,
        meta:{
          taskType: `sync_shopify_${type}_data_prisma`,
          totalCount,
          products: data.length
        }
      })
    }
    catch (e) {
      handlePrismaError(e)
    }

  }
}
