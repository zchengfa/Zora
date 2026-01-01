import {create} from "zustand/react";
import {deepCloneTS} from "@Utils/Utils.ts";
import {MessageDataType} from "@Utils/socket.ts";
import {CustomerDataType,CustomerStaffType} from "@/type.ts";
import {
  insertMessageToIndexedDB,
  readMessagesFromIndexedDB,
  syncMessageToIndexedDB
} from "@Utils/zustandWithIndexedDB.ts";
const SESSION_STORAGE_CHAT_LIST_KEY = "zora_chat_list";
const SESSION_STORAGE_ACTIVE_ITEM_KEY = "zora_active_item";
const SESSION_STORAGE_ACTIVE_CUSTOMER_INFO_KEY = "zora_active_customer_info";

export const useMessageStore = create((set)=>{
    return {
      messages: [],
      messageTimers:new Map() as Map<string,Map<string,ReturnType <typeof setTimeout>>>,
      messageMaxWaitingTimers: new Map() as Map<string,Map<string,ReturnType<typeof setTimeout>>>,
      chatList: [],
      SENDING_THRESHOLD:1000,
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
          const activeCustomerItem = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_ACTIVE_ITEM_KEY) as string) || undefined
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
      addMessage:async (message:MessageDataType) => {
        await insertMessageToIndexedDB(message)
        set((state)=>{
          const newMsg = deepCloneTS(state.messages)
          if(message.conversationId === state.activeCustomerItem){
            newMsg.push(message)
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
      updateMessageStatus:(ack)=>{
        set((state)=>{
          const newMessages = deepCloneTS(state.messages)
          newMessages.map((item:MessageDataType)=>{
            if(item.msgId === ack.msgId){
              item.msgStatus = ack.msgStatus
              syncMessageToIndexedDB(item,item.msgId).then()
            }
          })
          return {
            messages:newMessages
          }
        })
      },
      pushChatList:(payload:CustomerDataType)=>{
        set((state)=>{
          const newChatList = deepCloneTS(state.chatList);
          let existCount = 0,activeCustomerInfo = {}
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
            activeCustomerInfo = {
              avatar:payload.avatar,
              conversationId:payload.conversationId,
              id:payload.id,
              username:payload.firstName + payload.lastName,
            }
            //将更新后的列表保存至sessionStorage
            somethingSaveToSessionStorage([SESSION_STORAGE_CHAT_LIST_KEY,SESSION_STORAGE_ACTIVE_CUSTOMER_INFO_KEY],[newChatList,activeCustomerInfo])
          }
          return {
            chatList:newChatList,
            activeCustomerInfo
          }
        })
      },
      updateChatList:(payload:MessageDataType,fromAgent = false)=>{
        set((state)=>{
          const newChatList = deepCloneTS(state.chatList);
          newChatList.map((item:CustomerDataType)=>{
            if(!fromAgent){
              if(item.id === payload.senderId){
                item.lastMessage = payload.contentBody
                item.lastTimestamp = payload.timestamp
                if(item.conversationId === state.activeCustomerItem){
                  item.hadRead = true
                  item.unreadMessageCount = 0
                  item.isActive = true
                }
                else{
                  item.hadRead = false
                  item.unreadMessageCount ++
                  item.isActive = false
                }
              }
            }
            else{
              if(item.conversationId === state.activeCustomerItem){
                item.lastMessage = payload.contentBody
                item.lastTimestamp = payload.timestamp
              }
            }
            return item
          })
          //将更新后的列表保存至sessionStorage
          somethingSaveToSessionStorage(SESSION_STORAGE_CHAT_LIST_KEY,newChatList)
          return {
            chatList:newChatList,
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
          const conversation = cloneTimers.get(payload.conversationId);
          const maxConversation = cloneMaxWaitingTimers.get(payload.conversationId);
          if(!conversation){
            cloneTimers.set(payload.conversationId,new Map());
          }
          if(!maxConversation){
            cloneMaxWaitingTimers.set(payload.conversationId,new Map());
          }
          cloneTimers?.get(payload.conversationId).set(payload.msgId,payload.timer)
          cloneMaxWaitingTimers?.get(payload.conversationId)?.set(payload.msgId,payload.maxTimer)

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
          const timer = cloneTimers.get(ack.conversationId)?.get(ack.msgId)
          const maxTimer = cloneMaxWaitingTimers.get(ack.conversationId)?.get(ack.msgId)
          //清除定时器
          clearTimeout(timer)
          clearTimeout(maxTimer)
          //删除记录的timer
          cloneTimers.get(ack.conversationId)?.delete(ack.msgId)
          cloneMaxWaitingTimers?.get(ack.conversationId)?.delete(ack.msgId)

          return {
            messageTimers: cloneTimers,
            messageMaxWaitingTimers: cloneMaxWaitingTimers,
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
