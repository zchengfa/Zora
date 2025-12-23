// 客户信息数据类型
export interface CustomerDataType {
  id: string,
  firstName:string,
  lastName:string,
  avatar:string | null,
  isOnline:boolean,
  lastMessage:string,
  lastTimestamp:string,
  hadRead:boolean,
  isActive:boolean,
  unreadMessageCount:number,
  conversationId:string,
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

