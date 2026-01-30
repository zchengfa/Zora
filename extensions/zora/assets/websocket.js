let connectAttempts = 0
const MAX_CONNECT_ATTEMPTS = 5;
const socket = io(FETCH_BASE_URL.replace('https','wss'),{
  transports: ['websocket'],
  reconnectionAttempts:MAX_CONNECT_ATTEMPTS, //重连次数
  reconnectionDelay:2000,//重连间隔
  reconnectionDelayMax: 5000,
  timeout: 5000, // 连接超时时间
  headers:{
    "ngrok-skip-browser-warning": true, //绕过ngrok验证
  }
});

socket.on('connect_error',()=>{
  connectAttempts++
  if(connectAttempts > MAX_CONNECT_ATTEMPTS){
    socket.close()
    const bubbleContainer = document.querySelector('.zora-bubble-container')
    const bubbleContent = document.querySelector('.zora-bubble-content')
    bubbleContainer.classList.remove('hidden')
    bubbleContent.textContent = zoraResponse.responseMessage('error','socket_connect_failed')
  }
})

// 监听连接成功事件
socket.on('connect', () => {
  console.log('✅ 已成功连接到服务器！');
  const userInfo = sessionStorage.getItem('zora_userInfo');
  if(userInfo){
    socket.emit('online',userInfo)
    // 发送获取未读消息的事件（防止页面刷新后拿不到未读消息）
    const parsedUserInfo = JSON.parse(userInfo);
    socket.emit('get_unread_messages', {
      userId: parsedUserInfo.userId,
      shop: parsedUserInfo.shop
    });
  }
});

socket.on('conversation_success',(conversation_id)=>{
  sessionStorage.setItem('zora_conversation_id', conversation_id);
})

//接收后端回执
socket.on('message_ack',(ack)=>{
  console.log('消息回执',ack)
  renderMessage.setMessageStatus(ack.msgId,ack.msgStatus)
  renderMessage.updateMessageStatus(ack.msgId,ack.msgStatus)
})

// 监听来自服务器的事件，例如 'message'
socket.on('message', (data) => {
  //通过获取聊天窗口是否存在以及zora按钮状态来判断用户是否正在与客服聊天，
  const msgBoxEl = document.querySelector('.zora-message-box-active')
  const zoraBtnEl = document.querySelector('.zora-default-btn-box.btn-box-hidden')
  const msgStatus = msgBoxEl && zoraBtnEl ? 'READ' : 'DELIVERED'
  console.log(`收到服务器消息:发送回执告诉客服我已接收（未读）或已读，可发送消息状态：${msgStatus}`);
  socket.emit('message_delivered',{
    type: 'ACK',
    senderType: 'CUSTOMER',
    recipientId: data.senderId,
    msgId: data.msgId,
    conversationId: data.conversationId,
    msgStatus
  })
  renderMessage.addMessage(data,1);

  // 如果消息状态为DELIVERED（未读），增加未读消息计数
  if (msgStatus === 'DELIVERED' && data.senderType === 'AGENT') {
    updateUnreadCount(unreadMessageCount + 1);
  }
});

// 监听消息已读回执
socket.on('message_delivered', (ack) => {
  console.log('收到消息已读回执:', ack);
  if (ack.msgStatus === 'READ') {
    // 更新本地消息状态
    renderMessage.updateMessageStatus(ack.msgId, ack.msgStatus);
  }
});
//离线消息接收
socket.on('offline_messages',(data)=>{
  console.log('收到离线消息',data);
  const { messages, totalCount } = data;

  if(messages && messages.length > 0){
    // 批量处理消息模板
    const processedMessages = messages.map(msg => {

      return {
        ...msg,
        isOffline: true // 标记为离线消息
      };
    });

    // 一次性渲染所有离线消息
    renderMessage.addMessage(processedMessages, 1);

    // 收集所有离线消息的msgId
    const msgIds = processedMessages.map(msg => msg.msgId);

    // 发送离线消息确认回执给服务端
    socket.emit('offline_message_ack', {
      msgIds: msgIds
    });
  }
})

// 监听连接断开事件
socket.on('disconnect', () => {
  console.log('❌ 与服务器的连接已断开。');
});

// 监听批量消息已读回执
socket.on('messages_batch_read', (data) => {
  const { msgId, msgStatus } = data;
  renderMessage.batchUpdateMessageStatus(msgId, msgStatus);
  // 清除未读消息计数
  updateUnreadCount(0);
});

// 监听消息状态更新
socket.on('message_status_update', (data) => {
  const { messages } = data;
  if (messages && messages.length > 0) {
    // 批量更新本地消息状态
    messages.forEach(msg => {
      renderMessage.updateMessageStatus(msg.msgId, msg.msgStatus);
    });
  }
});

// 监听未读消息回执
socket.on('unread_messages', (data) => {
  const { messages, count } = data;
  // 更新未读消息数
  updateUnreadCount(count);
  // 将未读消息渲染到聊天窗口中
  if (messages && messages.length > 0) {
    // 检查聊天窗口是否已打开
    const msgBoxEl = document.querySelector('.zora-message-box-active');
    const zoraBtnEl = document.querySelector('.zora-default-btn-box.btn-box-hidden');
    const isChatOpen = msgBoxEl && zoraBtnEl;

    // 批量处理消息模板
    const processedMessages = messages.map(msg => {
      return {
        ...msg,
        isOffline: true // 标记为离线消息
      };
    });

    // 一次性渲染所有未读消息
    renderMessage.addMessage(processedMessages, 1);

    // 如果聊天窗口已打开，发送消息已读回执
    if (isChatOpen) {
      const msgIds = messages.map(msg => msg.msgId);
      socket.emit('messages_batch_read', {
        msgIds: msgIds,
        msgStatus: 'READ'
      });
    }
  }
});

window.addEventListener('beforeunload',()=>{
  const userInfo = JSON.parse(sessionStorage.getItem('zora_userInfo'));
  if(userInfo)
  socket.emit('offline',{id:userInfo.userId})
})
