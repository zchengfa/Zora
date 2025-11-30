import {Session} from "@shopify/shopify-api";
import {ShopifyAPI} from "@plugins/axios.ts"

export class ShopifyUtils {
  private readonly shopConfig: { apiVersion: string; shopDomain: string; accessToken: string };
  private shopifyApi: ShopifyAPI;
  constructor(session:Session) {
    this.shopifyApi = new ShopifyAPI()
    this.shopConfig = {
      shopDomain:session.shop,
      accessToken:(session.accessToken) as string,
      apiVersion: '2025-10'
    }
  }

  syncShopifyData = async ()=>{
    // return await this.shopifyApi.graphql({
    //   ...this.shopConfig,
    //   query: CUSTOMER_QUERY,
    //   variables:{
    //     limit: 10
    //   }
    // }

    return await this.shopifyApi.get({
      ...this.shopConfig,
      url:'/orders.json'
    })
  }
}
