import {ShopifyAPI} from "./axios.ts"

export class ShopifyApiClient {
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

}
