import {create} from "zustand/react";
import {deepCloneTS} from "@Utils/Utils.ts";
import {MessageDataType} from "@Utils/socket.ts";
import type {CustomerDataType, CustomerStaffType, GraphqlProductInfoType, MessageAckType} from "@/type.ts";
import {
  readMessagesFromIndexedDB,
  syncMessageToIndexedDB,
  syncMessagesBatchToIndexedDB
} from "@Utils/zustandWithIndexedDB.ts";

const SESSION_STORAGE_CHAT_LIST_KEY = "zora_chat_list";
const SESSION_STORAGE_ACTIVE_ITEM_KEY = "zora_active_item";
const SESSION_STORAGE_ACTIVE_CUSTOMER_INFO_KEY = "zora_active_customer_info";

export interface UseMessageStoreType {
  messages: MessageDataType[];
  messageTimers: Map<string, Map<string, ReturnType<typeof setTimeout>>>;
  messageMaxWaitingTimers: Map<string, Map<string, ReturnType<typeof setTimeout>>>;
  chatList: CustomerDataType[];
  SENDING_THRESHOLD: number;
  MAX_WAITING_THRESHOLD: number;
  page: number;
  pageSize: number;
  customerStaff: any;
  activeCustomerInfo: any;
  activeCustomerItem: string;
  shopify_Shop_products: GraphqlProductInfoType;
  countedMsgIds: Set<string>;
  initMessages: (target: string) => Promise<void>;
  initZustandState: (customerStaff: any, products: GraphqlProductInfoType) => void;
  addMessage: (message: MessageDataType | MessageDataType[]) => Promise<void>;
  changeMessages: (params: { conversationId: string; page: number; pageSize: number }) => Promise<void>;
  updateMessageStatus: (ack: MessageAckType) => void;
  pushChatList: (payload: CustomerDataType) => void;
  updateChatList: (payload: MessageDataType | MessageDataType[], fromAgent?: boolean) => void;
  readChatList: (conversationId: string) => void;
  updateTimer: (payload: {timer:ReturnType<typeof setTimeout>,maxTimer:ReturnType<typeof setTimeout>} & MessageAckType) => void;
  clearUpTimer: (ack: MessageAckType) => void;
  setChatList: (chatList: CustomerDataType[]) => void;
  setActiveCustomerInfo: (activeCustomerItem: string, activeCustomerInfo: any) => void;
}

export const useMessageStore = create<UseMessageStoreType>((set)=>{
    return {
      messages: [],
      messageTimers:new Map() as Map<string,Map<string,ReturnType <typeof setTimeout>>>,
      messageMaxWaitingTimers: new Map() as Map<string,Map<string,ReturnType<typeof setTimeout>>>,
      chatList: [],
      SENDING_THRESHOLD:1000,
      countedMsgIds: new Set<string>(),
      MAX_WAITING_THRESHOLD:10000,
      page: 1,
      pageSize: 20,
      customerStaff: null,
      activeCustomerInfo:null,
      activeCustomerItem: undefined,
      shopify_Shop_products:{},
      initMessages:async (target:string)=>{
        let messages = []
        if (target){
          const readResult = await readMessagesFromIndexedDB({
            page:1,
            pageSize: 20,
            indexValue: target
          })
          messages = readResult.list.reverse()
        }
        set(()=>{
          return {
            messages,
          }
        })
      },
      initZustandState:(customerStaff:CustomerStaffType,products)=>{
        set(()=>{
          const chatList = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_CHAT_LIST_KEY) as string) || []
          const activeCustomerItem = sessionStorage.getItem(SESSION_STORAGE_ACTIVE_ITEM_KEY) || undefined
          const activeCustomerInfo = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_ACTIVE_CUSTOMER_INFO_KEY) as string) || null
          if(!customerStaff){
            return {
              chatList,
              activeCustomerItem,
              activeCustomerInfo,
              shopify_Shop_products:products
            }
          }
          return {
            chatList,
            activeCustomerItem,
            activeCustomerInfo,
            shopify_Shop_products:products,
            customerStaff
          }
        })
      },
      addMessage:async (message:MessageDataType | MessageDataType[]) => {
        // 判断是单条消息还是消息数组
        const messages = Array.isArray(message) ? message : [message]

        set((state)=>{
          const newMsg = deepCloneTS(state.messages)
          // 创建一个Set来快速查找已存在的消息ID
          const existingMsgIds = new Set(state.messages.map(msg => msg.msgId))
          // 收集需要添加的新消息
          const messagesToAdd:MessageDataType[] = []

          messages.forEach((msg: MessageDataType) => {
            if(!existingMsgIds.has(msg.msgId)){
              messagesToAdd.push(msg)
            }
            if(msg.conversationId === state.activeCustomerItem){
              newMsg.push(msg)
            }
          })

          // 批量插入到IndexedDB
          if(messagesToAdd.length > 0){
            syncMessagesBatchToIndexedDB(messagesToAdd).then()
          }

          return {
            messages:newMsg
          }
        })
      },
      changeMessages:async ({conversationId, page, pageSize}:{ conversationId:string, page:number, pageSize:number })=>{
        const readResult = await readMessagesFromIndexedDB({
          page,
          pageSize,
          indexValue: conversationId
        })
        set(()=>{
          return {
            messages:readResult.list.reverse(),
          }
        })
      },
      updateMessageStatus:(ack: MessageAckType)=>{
        set((state)=>{
          const newMessages = deepCloneTS(state.messages)
          // 检查是否是批量更新（包含msgIds数组）
          if (ack.msgId && Array.isArray(ack.msgId)) {
            // 批量更新：创建一个Set来快速查找需要更新的msgId
            const msgIdsSet = new Set(ack.msgId)
            const messagesToUpdate:MessageDataType[] = []
            newMessages.forEach((item:MessageDataType)=>{
              if(msgIdsSet.has(item.msgId)){
                item.msgStatus = ack.msgStatus
                messagesToUpdate.push(item)
              }
            })
            // 批量更新IndexedDB
            syncMessagesBatchToIndexedDB(messagesToUpdate).then()
          } else {
            // 单条更新
            newMessages.map((item:MessageDataType)=>{
              if(item.msgId === ack.msgId){
                item.msgStatus = ack.msgStatus
                syncMessageToIndexedDB(item).then()
              }
            })
          }
          return {
            messages:newMessages
          }
        })
      },
      pushChatList:(payload:CustomerDataType)=>{
        set((state)=>{
          const newChatList = deepCloneTS(state.chatList);
          let existCount = 0
          if(newChatList.length > 0){
            newChatList.map((item:CustomerDataType)=>{
              if(item.conversationId === payload.conversationId){
                existCount ++
              }
            })
          }
          if(!existCount){
            newChatList.push({
              id: payload.id,
              firstName:payload.firstName,
              lastName:payload.lastName,
              avatar:payload.avatar,
              conversationId:payload.conversationId,
              isOnline:true,
              lastMessage:payload.lastMessage,
              lastTimestamp:payload.lastTimestamp,
              hadRead:false,
              isActive:false,
              unreadMessageCount:1
            })
            //将更新后的列表保存至sessionStorage
            somethingSaveToSessionStorage(SESSION_STORAGE_CHAT_LIST_KEY,newChatList)
          }
          return {
            chatList:newChatList,
          }
        })
      },
      updateChatList:(payload:MessageDataType | MessageDataType[],fromAgent = false)=>{
        set((state)=>{
          const newChatList = deepCloneTS(state.chatList);
          const messages = Array.isArray(payload) ? payload : [payload]
          const newCountedMsgIds = new Set(state.countedMsgIds)

          newChatList.map((item:CustomerDataType)=>{
            messages.forEach((msg: MessageDataType) => {
              // 检查消息是否属于当前聊天项
              const isMessageForThisChat = item.conversationId === msg.conversationId;

              if(!fromAgent){
                // 处理客户发送的消息
                if(item.id === msg.senderId || isMessageForThisChat){
                  item.lastMessage = msg.contentBody
                  item.lastTimestamp = msg.timestamp
                  // 不管是否是活跃聊天项，都检查未读计数
                  if(item.conversationId === state.activeCustomerItem){
                    item.hadRead = true
                    item.unreadMessageCount = 0
                    item.isActive = true
                  }
                  else{
                    // 只对消息状态不为READ且未计过数的消息进行计数
                    if(msg.msgStatus !== 'READ' && !newCountedMsgIds.has(msg.msgId)){
                      item.hadRead = false
                      item.unreadMessageCount ++
                      item.isActive = false
                      // 将消息ID添加到countedMsgIds中
                      newCountedMsgIds.add(msg.msgId)
                    }
                  }
                }
              }
              else{
                // 处理客服发送的消息
                if(isMessageForThisChat){
                  switch (msg.contentType) {
                    case "TEXT":
                      item.lastMessage = msg.contentBody
                      break;
                    case "IMAGE":
                      item.lastMessage = '[图片]'
                      break;
                    case "PRODUCT":
                      item.lastMessage = `[产品] ${JSON.parse(msg.contentBody)?.title}`
                      break;
                    default:
                      break;
                  }
                  item.lastTimestamp = msg.timestamp

                  // 不管是否是活跃聊天项，都检查未读计数
                  if(item.conversationId !== state.activeCustomerItem){
                    // 只对消息状态不为READ且未计过数的消息进行计数
                    if(msg.msgStatus !== 'READ' && !newCountedMsgIds.has(msg.msgId)){
                      item.hadRead = false
                      item.unreadMessageCount ++
                      item.isActive = false
                      // 将消息ID添加到countedMsgIds中
                      newCountedMsgIds.add(msg.msgId)
                    }
                  }
                }
              }
            })
            return item
          })
          //将更新后的列表保存至sessionStorage
          somethingSaveToSessionStorage(SESSION_STORAGE_CHAT_LIST_KEY,newChatList)
          return {
            chatList:newChatList,
            countedMsgIds: newCountedMsgIds
          }
        })
      },
      readChatList:(conversationId:string)=>{
        set((state)=>{
          const newChatList = deepCloneTS(state.chatList)
          let activeItem = undefined
          let activeCustomerInfo = undefined
          newChatList.map((item:CustomerDataType)=>{
            if(item.conversationId === conversationId){
              item.hadRead = true
              item.isActive = true
              item.unreadMessageCount = 0
              activeItem = item.conversationId
              activeCustomerInfo = {
                id: item.id,
                avatar:item.avatar,
                conversationId:item.conversationId,
                username:item.firstName + item.lastName
              }
            }
            else{
              item.isActive = false
            }
            return item
          })
          //将更新后的列表保存至sessionStorage
          somethingSaveToSessionStorage([SESSION_STORAGE_CHAT_LIST_KEY,SESSION_STORAGE_ACTIVE_ITEM_KEY,SESSION_STORAGE_ACTIVE_CUSTOMER_INFO_KEY],[newChatList,activeItem,activeCustomerInfo])
          return {
            chatList:newChatList,
            activeCustomerItem: activeItem,
            activeCustomerInfo
          }
        })
      },
      updateTimer:(payload)=>{
        set((state)=>{
          const cloneTimers = deepCloneTS(state.messageTimers)
          const cloneMaxWaitingTimers = deepCloneTS(state.messageMaxWaitingTimers)
          const conversation = cloneTimers.get(payload.conversationId as string);
          const maxConversation = cloneMaxWaitingTimers.get(payload.conversationId as string);
          if(!conversation){
            cloneTimers.set(payload.conversationId as string,new Map());
          }
          if(!maxConversation){
            cloneMaxWaitingTimers.set(payload.conversationId as string,new Map());
          }
          cloneTimers?.get(payload.conversationId as string)?.set(payload.msgId,payload.timer)
          cloneMaxWaitingTimers?.get(payload.conversationId as string)?.set(payload.msgId,payload.maxTimer)

          return {
            messageTimers: cloneTimers,
            messageMaxWaitingTimers: cloneMaxWaitingTimers,
          }
        })
      },
      clearUpTimer:(ack)=>{
        //收到回执，需要清除发送中的定时器和兜底定时器
        set((state)=>{
          const cloneTimers = deepCloneTS(state.messageTimers)
          const cloneMaxWaitingTimers = deepCloneTS(state.messageMaxWaitingTimers)
          const timer = cloneTimers.get(ack.conversationId as string)?.get(ack.msgId)
          const maxTimer = cloneMaxWaitingTimers.get(ack.conversationId as string)?.get(ack.msgId)
          //清除定时器
          clearTimeout(timer)
          clearTimeout(maxTimer)
          //删除记录的timer
          cloneTimers.get(ack.conversationId as string)?.delete(ack.msgId)
          cloneMaxWaitingTimers?.get(ack.conversationId as string)?.delete(ack.msgId)

          return {
            messageTimers: cloneTimers,
            messageMaxWaitingTimers: cloneMaxWaitingTimers,
          }
        })
      },
      setChatList:(chatList:CustomerDataType[])=>{
        set(()=>{
          //将更新后的列表保存至sessionStorage
          somethingSaveToSessionStorage(SESSION_STORAGE_CHAT_LIST_KEY,chatList)
          return {
            chatList
          }
        })
      },
      setActiveCustomerInfo:(activeCustomerItem:string, activeCustomerInfo:any)=>{
        set(()=>{
          //将激活的客户信息保存至sessionStorage
          somethingSaveToSessionStorage([SESSION_STORAGE_ACTIVE_ITEM_KEY, SESSION_STORAGE_ACTIVE_CUSTOMER_INFO_KEY], [activeCustomerItem, activeCustomerInfo])
          return {
            activeCustomerItem,
            activeCustomerInfo
          }
        })
      }
    }
  }
)

function somethingSaveToSessionStorage(keys:string | string[],values:any){
  if(Array.isArray(keys) && Array.isArray(values)){
    if(keys.length !== values.length){
      throw new Error(`Target:(zustand.ts) From somethingSaveToSessionStorage function error : your keys array  length must equal to values`)
    }
    else{
      for (let i = 0; i < keys.length; i++) {
        sessionStorage.setItem(keys[i],JSON.stringify(values[i]))
      }
    }
  }
  else{
    sessionStorage.setItem(keys, JSON.stringify(values))
  }
}
