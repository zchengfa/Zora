import {LoaderFunctionArgs, useLoaderData} from "react-router";
import {authenticate} from "@/shopify.server";
import indexStyle from '@styles/pages/app_index.module.scss'
import ZoraSearch from '@components/ZoraSearch'
import ZoraCustomerList from '@components/ZoraCustomerList'
import ZoraMessageItems from "@components/ZoraMessageItems";
import ZoraChat from "@components/ZoraChat.tsx";
import {useSocketService} from "@hooks/useSocketService.ts";
import {useEffect} from "react";
import {useMessageStore} from "@/zustand/zustand.ts";
import {shopifyRequestUserInfo,shopifyCustomerStaffInit} from "@/network/request.ts";

export const loader = async ({request}:LoaderFunctionArgs)=>{
  const {admin} = await authenticate.admin(request)
  const params = request.url.substring(request.url.indexOf('?'),request.url.length)
  const shopOwnerName = await admin.graphql(
    `query shopOwnerName {
        shop {
          email
          shopOwnerName
        }
    }`
  )
  const {data} = await shopOwnerName.json()
  const result = await shopifyCustomerStaffInit(params,data.shop.email,data.shop.shopOwnerName)
  return {
    params,
    customerStaff: result.data
  }
}

function Index(){
  const {params,customerStaff} = useLoaderData<typeof loader>();
  const {message,socket,messageAck} = useSocketService();
  const messageStore = useMessageStore();

  useEffect(() => {
    messageStore.initZustandState(customerStaff)
    messageStore.initMessages(JSON.parse(sessionStorage.getItem('zora_active_item') as string)).then()
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
        shopifyRequestUserInfo(params+'&id='+message.senderId).then(res=>{
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
          messageStore.addMessage(message)
        }).catch(err=>{
            console.log(err)
          })
      }
      //存在，只需更新对应列表项的部分数据
      else{
        messageStore.updateChatList(message)
        messageStore.addMessage(message)
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
    const msgData = {
      senderId: messageStore.customerStaff.id,
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
    socket.emit('sendMessage',JSON.stringify(msgData))
    let sendTimer = setTimeout(() => {
     //显示消息发送中状态
      messageStore.updateMessageStatus({
        msgId: msgData.msgId,
        msgStatus: 'SENDING',
      })
    },messageStore.SENDING_THRESHOLD)

    const maxWaitingTimer = setTimeout(()=>{
      //兜底，防止长时间没有收到消息回执，显示消息发送失败
      messageStore.updateMessageStatus({
        msgId: msgData.msgId,
        msgStatus: 'FAILED',
      })
    },messageStore.MAX_WAITING_THRESHOLD)
    messageStore.updateTimer({
      conversationId: msgData.conversationId,
      msgId: msgData.msgId,
      msgStatus: msgData.msgStatus,
      timer: sendTimer,
      maxTimer: maxWaitingTimer
    })
    messageStore.updateChatList(msgData,true)

    msgData.msgStatus = ''
    messageStore.addMessage(msgData).then()

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
          {/*客户列表*/}
          <div className={indexStyle.chatLeft}>
            <ZoraSearch placeholder={'Search'}></ZoraSearch>
            <ZoraCustomerList customerData={messageStore.chatList} ItemClick={customerItemClick}></ZoraCustomerList>
          </div>
          {/*聊天部分*/}
          <div className={indexStyle.chatMiddle}>
            <ZoraMessageItems messageData={messageStore.messages}></ZoraMessageItems>
            <ZoraChat sendMessage={sendMsg}></ZoraChat>
          </div>
          <div className={indexStyle.chatRight}></div>
        </div>
      </div>
    </div>
  </div>
}

export default Index
