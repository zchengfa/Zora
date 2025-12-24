import {Get, Post} from "@/network/network.ts";

export const shopifyRequestUserInfo  = (params:string)=>{
  return Get({
    url: `/shopifyUserInfo${params}`,
  })
}

export const shopifyApiClientInit = ({shop,accessToken}:{shop:string,accessToken:string}) => {
  return Post({
    url:'/shopifyApiClientInit',
    data:{
      shop,accessToken,
    }
  })
}

export const shopifyCustomerStaffInit = (params:string,email:string,shopOwnerName:string)=>{
  return Post({
    url:`/shopifyCustomerStaffInit${params}`,
    data:{
      email,shopOwnerName
    }
  })
}
