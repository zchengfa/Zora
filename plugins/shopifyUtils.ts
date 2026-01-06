import {ShopifyAPI} from "./axios.ts"
import {
  CUSTOMER_COUNT_QUERY,
  CUSTOMERS_QUERY,
  SHOP_OWNER_NAME_QUERY,
  ORDERS_COUNT_QUERY,
} from "./shopifyQuery.ts";
import type {
  GraphqlShopResponse,
  GraphqlCustomerCountResponse,
  GraphqlCustomerResponse,
  GraphqlOrdersCountResponse
} from './shopifyQuery.ts'
import type {PrismaClient} from "@prisma/client";
import type {Redis} from "ioredis"


export interface IShopifyApiClient {
  /**
   * 获取店铺所有者信息
   */
  shopOwner(): Promise<GraphqlShopResponse>,

  /**
   * 查询客户信息
   */
  customers(limit:number,afterCursor?:string): Promise<GraphqlCustomerResponse>,

  /**
   * 查询客户数量
   */
  customerCount(): Promise<GraphqlCustomerCountResponse>,

  /**
   * 查询订单数量
   */
  ordersCount(): Promise<GraphqlOrdersCountResponse>,
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
  private shopifyApiGraphqlRequest = (query:string,variables?:any)=>{
    return this.shopifyApi.graphql({
      ...this.shopConfig,
      query,
      variables:{
        ...variables
      }
    })
  }
  public shopOwner = ():Promise<GraphqlShopResponse>=>{
    return this.shopifyApiGraphqlRequest(SHOP_OWNER_NAME_QUERY)
  }

  public ordersCount = ():Promise<GraphqlOrdersCountResponse> =>{
    return this.shopifyApiGraphqlRequest(ORDERS_COUNT_QUERY)
  }

  public customerCount = ():Promise<GraphqlCustomerCountResponse>=>{
    return this.shopifyApiGraphqlRequest(CUSTOMER_COUNT_QUERY)
  }

  public customers = (limit:number,afterCursor?:string):Promise<GraphqlCustomerResponse>=>{
    return this.shopifyApiGraphqlRequest(CUSTOMERS_QUERY,{
      limit,
      afterCursor
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
