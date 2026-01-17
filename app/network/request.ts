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

export const shopifyCustomerStaffInit = (query:string,email:string,shopOwnerName:string)=>{
  return Post({
    url:`/shopifyCustomerStaffInit${query}`,
    data:{
      email,shopOwnerName
    }
  })
}
