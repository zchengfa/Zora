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

export const searchCustomers = (keyword: string) => {
  return Get({
    url: `/customers/search?keyword=${encodeURIComponent(keyword)}`
  })
}

export const addCustomerToChatList = (agentId: string, customerId: string) => {
  return Post({
    url: '/chatList/add',
    data: {
      agentId,
      customerId
    }
  })
}

// 获取客服设置
export const getAgentSettings = (staffProfileId: string) => {
  return Get({
    url: `/agent/settings?staffProfileId=${staffProfileId}`
  })
}

// 更新客服设置
export const updateAgentSettings = (settings: any) => {
  return Post({
    url: '/agent/settings/update',
    data: settings
  })
}

// 卸载应用，清理商店数据
export const uninstallApp = (shopDomain: string) => {
  return Post({
    url: '/uninstall',
    data: {
      shopDomain
    }
  })
}
