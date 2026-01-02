import SocketService, {MessageDataType} from "@Utils/socket.ts";
import {UseMessageStoreType} from "@/zustand/zustand.ts";

export const MessageServiceSendMessage = (options:{messageStore:UseMessageStoreType,socket:SocketService,message:MessageDataType})=>{
  const {messageStore,socket,message} = options
  const msgData = message
  socket.emit('sendMessage',JSON.stringify(msgData))
  const sendTimer = setTimeout(() => {
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
