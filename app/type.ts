// 客户信息数据类型
export interface CustomerDataType {
  id: string,
  firstName:string,
  lastName:string,
  avatar:string | null,
  isOnline?:boolean,
  lastMessage:string,
  lastTimestamp:string | number,
  hadRead?:boolean,
  isActive?:boolean,
  unreadMessageCount?:number,
  conversationId?:string,
}

export interface CustomerStaffType {
  id?:string,
  name?:string
  email?:string,
  avatarUrl?:string
}

type OwnerType = "customer_msg" | "agent_msg" | "bot_msg"
type RoleType = "customer" | "agent" | "bot"
type MsgType = "text" | "Image" | "product_card"

//消息数据类型
export interface MessageBoxType {
  id: string,
  conversation_id: string,
  owner: OwnerType,
  msg_status:{
    sent:boolean,
    delivered:boolean,
    read:boolean,
  },
  sender:{
    type:RoleType
    id:string
  },
  recipient:{
    type:RoleType
    id:string
  }
  content: TextContent | ImageContent | ProductCardContent
}

interface TextContent {
  type: MsgType,
  body:string,
}

interface ImageContent {
  type: MsgType,
  "url": string,
  "thumbnail_url": string | undefined
}

interface ProductCardContent {
  "type": MsgType,
  "product_id": string,
  "title": string,
  "price": number,
  "image_url": string
}

export interface GraphqlShopInfoType {
  shop:{
    email: string,
    shopOwnerName:string
  }
}

export interface GraphqlProductInfoType {
  products:{
    nodes:Array<{
      id: string,
      title: string,
      description: string,
      descriptionHtml: string,
      tags: Array<string>,
      vendor:string
      variants:{
        nodes:Array<{price:number}>
      },
      compareAtPriceRange:{
        maxVariantCompareAtPrice:{
          currencyCode:string
          amount:number
        },
        minVariantCompareAtPrice:{
          currencyCode:string
          amount:number
        }
      },
      featuredMedia:{
        preview:{
          image:{
            url:string
          }
        }
      },
      media:{
        nodes:Array<{preview:{image:{url:string}}}>
      }
    }>,
    pageInfo: {
      hasNextPage:boolean,
      hasPreviousPage: boolean,
      startCursor: string,
      endCursor: string
    }
  }
}

export type MessageAckType = {
  code?:string
  conversationId?:string,
  msgId:string,
  msgStatus:string
  timestamp?:string
  type?:'ACK',
}


export type ZoraProductType = GraphqlProductInfoType["products"]["nodes"][0]

