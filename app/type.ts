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

// 通知类型定义
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationConfig {
  /** 通知ID */
  id?: string;
  /** 通知类型 */
  type?: NotificationType;
  /** 通知标题 */
  title?: string;
  /** 通知内容 */
  message: string;
  /** 通知持续时间(毫秒)，0表示不自动关闭 */
  duration?: number;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 点击通知的回调 */
  onClick?: () => void;
  /** 关闭通知的回调 */
  onClose?: () => void;
  /** 显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否可点击关闭 */
  closable?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 通知位置 */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

