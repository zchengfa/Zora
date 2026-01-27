import {LoaderFunctionArgs, useLoaderData} from "react-router";
import {authenticate} from "@/shopify.server";
import indexStyle from '@styles/pages/app_index.module.scss'
import ZoraSearch from '@components/ZoraSearch'
import ZoraCustomerList from '@components/ZoraCustomerList'
import ZoraMessageItems from "@components/ZoraMessageItems";
import ZoraChat from "@components/ZoraChat.tsx";
import {useSocketService} from "@hooks/useSocketService.ts";
import {useSocketNotification} from "@hooks/useSocketNotification.ts";
import {useEffect} from "react";
import {useMessageStore} from "@/zustand/zustand.ts";
import {shopifyRequestUserInfo,shopifyCustomerStaffInit,getChatList} from "@/network/request.ts";
import {SHOP_INFO_QUERY_GQL,PRODUCTS_QUERY_GQL} from "@Utils/graphql.ts";
import {MessageDataType} from "@Utils/socket.ts";
import {MessageServiceSendMessage} from "@Utils/MessageService.ts";
import {
  insertMessageToIndexedDB,
  readMessagesFromIndexedDB,
  syncMessageToIndexedDB
} from "@Utils/zustandWithIndexedDB.ts";

export const loader = async ({request}:LoaderFunctionArgs)=>{
  const {admin} = await authenticate.admin(request)
  let params = request.url.substring(request.url.indexOf('?'),request.url.length)
  if(!params.includes('hmac')){
    params = ''
  }
  const shopOwnerName = await admin.graphql(SHOP_INFO_QUERY_GQL)
  const response = await  admin.graphql(PRODUCTS_QUERY_GQL, {variables:{first: 10}})
  const result = await response.json()

  const {data} = await shopOwnerName.json()
  let customerStaff;
  try {
    const result = await shopifyCustomerStaffInit(params,data.shop.email,data.shop.shopOwnerName,data.shop.myshopifyDomain)
    customerStaff = result?.data
  }
  catch (e) {
    customerStaff = null
  }

  return {
    params,
    customerStaff,
    products:result?.data,
  }
}

function Index(){
  const {params,customerStaff,products} = useLoaderData<typeof loader>();
  const {message,socket,messageAck} = useSocketService();
  // 使用通知Hook监听socket通知并显示
  useSocketNotification();

  const messageStore = useMessageStore();

  useEffect(() => {
    messageStore.initZustandState(customerStaff,products)
    messageStore.initMessages(sessionStorage.getItem('zora_active_item') as string).then()

    // 获取并同步聊天列表
    if (customerStaff?.id) {
      getChatList(customerStaff.id)
        .then(async res => {
          if (res?.data?.chatList) {
            // 1. 检查是否有激活的列表项
            const activeItem = res.data.chatList.find(item => item.isActive)

            // 2. 如果有激活的列表项，更新zustand状态（内部会处理sessionStorage存储）
            if (activeItem?.conversationId) {
              // 提取客户信息
              const activeCustomerInfo = {
                id: activeItem.id,
                firstName: activeItem.firstName,
                lastName: activeItem.lastName,
                avatar: activeItem.avatar,
                isOnline: activeItem.isOnline
              }

              // 更新zustand中的activeCustomerItem和activeCustomerInfo状态
              messageStore.setActiveCustomerInfo(activeItem.conversationId, activeCustomerInfo)
            }

            // 3. 设置聊天列表
            messageStore.setChatList(res.data.chatList)

            // 4. 同步消息到IndexedDB
            for (const chatItem of res.data.chatList) {
              if (chatItem.messages && chatItem.messages.length > 0) {
                // 获取本地已存储的消息
                const localMessages = await readMessagesFromIndexedDB({
                  page: 1,
                  pageSize: 1000,
                  indexValue: chatItem.conversationId
                })

                // 创建本地消息的Map，用于快速查找
                const localMessageMap = new Map<string, MessageDataType>()
                localMessages.list.forEach((msg: MessageDataType) => {
                  localMessageMap.set(msg.msgId, msg)
                })

                // 对比并同步消息
                for (const remoteMsg of chatItem.messages) {
                  const localMsg = localMessageMap.get(remoteMsg.msgId)

                  if (!localMsg) {
                    // 本地不存在该消息，直接插入
                    await insertMessageToIndexedDB(remoteMsg)
                  } else {
                    // 本地已存在，对比时间戳，如果服务器消息更新则同步
                    if (remoteMsg.timestamp > localMsg.timestamp) {
                      await syncMessageToIndexedDB(remoteMsg)
                    }
                  }
                }

                // 5. 如果是激活的对话，更新zustand中的消息
                if (chatItem.isActive && chatItem.conversationId) {
                  messageStore.initMessages(chatItem.conversationId).then()
                }
              }
            }
          }
        })
        .catch(err => {
          console.error('获取聊天列表失败:', err)
        })
    }

    socket.on('connect', () => {
      console.log('✅ 已成功连接到服务器！');
      socket.emit('agent',{
        id:customerStaff.id,
        name:customerStaff.name,
      })
    });
  }, []);


  useEffect(() => {
    if(messageAck){
      //收到回执，更新消息状态
      messageStore.updateMessageStatus(messageAck)
      messageStore.clearUpTimer(messageAck)
    }
  }, [messageAck]);

  useEffect(() => {
    if(message){
      let isExistUser = false
      const userList = messageStore.chatList
      if(!userList.length){
        isExistUser = false
      }
      else{
        userList.forEach(user=>{
          isExistUser =  user.id === message.senderId
        })
      }
      //列表不存在该客户信息，需要新增客户聊天列表项
      if(!isExistUser){
        shopifyRequestUserInfo(params ? params+'&id='+message.senderId : `?id=${message.senderId}`).then(res=>{
          const {userInfo} = res.data
          messageStore.pushChatList({
            id:userInfo.id,
            firstName: userInfo.first_name,
            lastName: userInfo.last_name,
            avatar: userInfo.image_url,
            lastMessage: message.contentBody,
            conversationId: message.conversationId,
            lastTimestamp: message.timestamp
          })
          messageStore.addMessage(message).then()
        }).catch(err=>{
            console.log(err)
          })
      }
      //存在，只需更新对应列表项的部分数据
      else{
        messageStore.updateChatList(message)
        messageStore.addMessage(message).then()
      }
      socket.emit('message_delivered',{
        type: 'ACK',
        senderType: 'AGENT',
        recipientId: message.senderId,
        msgId: message.msgId,
        msgStatus: messageStore.activeCustomerItem === message.conversationId ? 'READ' : 'DELIVERED'
      })
    }
  }, [message]);

  const customerItemClick = async (conversationId:string)=>{
    if(messageStore.activeCustomerItem !== conversationId){
      messageStore.readChatList(conversationId)
      await messageStore.changeMessages({
        conversationId,
        page:messageStore.page,
        pageSize: messageStore.pageSize
      })
    }
  }

  const sendMsg = (msg:string)=>{
    const msgData:MessageDataType = {
      senderId: messageStore.customerStaff?.id,
      senderType: 'AGENT',
      contentType: 'TEXT',
      msgStatus: 'SENDING',
      recipientType: 'CUSTOMER',
      recipientId: messageStore.activeCustomerInfo.id,
      contentBody: msg,
      msgId: 'msg_'+ new Date().getTime(),
      conversationId: messageStore.activeCustomerItem,
      timestamp: new Date().getTime(),
    }
    MessageServiceSendMessage({
      message:msgData,
      socket,
      messageStore
    })
  }
  return <div className={indexStyle.container}>
    <div className={indexStyle.content}>
      <div className={indexStyle.statusBox}>
        <span className={indexStyle.tipSpan}>Status:</span>
        <div className={indexStyle.tipBox}>
          <span className={indexStyle.status}>Online</span>
        </div>
      </div>
      <div className={indexStyle.chatContent}>
        <h3 className={indexStyle.chatTitle}>chat</h3>
        <div className={indexStyle.chatBox}>
          <div className={indexStyle.chatLeft}>
            <ZoraSearch placeholder={'Search'}></ZoraSearch>
            <ZoraCustomerList customerData={messageStore.chatList} ItemClick={customerItemClick}></ZoraCustomerList>
          </div>
          <div className={indexStyle.chatMiddle}>
            <ZoraMessageItems messageData={messageStore.messages}></ZoraMessageItems>
            {
              messageStore.messages.length ? <ZoraChat sendMessage={sendMsg}></ZoraChat> : null
            }
          </div>
          <div className={indexStyle.chatRight}></div>
        </div>
      </div>
    </div>
  </div>
}

export default Index
