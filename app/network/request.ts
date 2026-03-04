import {Get, Post} from "@/network/network.ts";

export const shopifyRequestUserInfo  = (query:string)=>{
  return Get({
    url: `/shopifyUserInfo${query}`,
  })
}

export const shopifyApiClientInit = (shop:string) => {
  return Post({
    url:'/shopifyApiClientInit',
    data:{
      shop
    }
  })
}

export const shopifyCustomerStaffInit = (query:string,email:string,shopOwnerName:string,shopDomain:string)=>{
  return Post({
    url:`/shopifyCustomerStaffInit${query}`,
    data:{
      email,shopOwnerName,shopDomain
    }
  })
}

export const getChatList = (agentId: string) => {
  return Get({
    url: `/chatList?agentId=${agentId}`,
  })
}

export const getOrders = (shopDomain:string)=>{
  return Post({
    url: '/orders',
    data:{
      shopDomain
    }
  })
}

export const getTrackingInfo = (trackingNumber: string, carrier: string) => {
  return Post({
    url: '/orders/tracking',
    data: {
      trackingNumber,
      carrier
    }
  })
}

export const getCarriers = (shopDomain?: string) => {
  const url = shopDomain ? `/orders/carriers?shopDomain=${shopDomain}` : '/orders/carriers';
  return Get({
    url
  })
}

export const getParcelTemplates = (carrier: string) => {
  return Get({
    url:`/orders/parcel-templates?carrier=${carrier}`
  })
}
