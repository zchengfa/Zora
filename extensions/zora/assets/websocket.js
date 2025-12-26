const socket = io(FETCH_BASE_URL.replace('https','wss'),{
  transports: ['websocket'],
  headers:{
    "ngrok-skip-browser-warning": true, //绕过ngrok验证
  }
});

// 监听连接成功事件
socket.on('connect', () => {
  console.log('✅ 已成功连接到服务器！');
  const userInfo = sessionStorage.getItem('zora_userInfo');
  if(userInfo){
    socket.emit('online',userInfo)
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
  //通过获取聊天窗口是否存在来判断用户是否正在与客服聊天，
  const msgBoxEl = document.querySelector('.zora-message-box-active')
  const msgStatus = msgBoxEl ? 'READ' : 'DELIVERED'
  console.log('收到服务器消息:', data,`发送回执告诉客服我已接收（未读）或已读，可发送消息状态：${msgStatus}`);
  socket.emit('message_delivered',{
    type: 'ACK',
    senderType: 'CUSTOMER',
    recipientId: data.senderId,
    msgId: data.msgId,
    msgStatus
  })
  renderMessage.addMessage(data,1);
});

// 监听连接断开事件
socket.on('disconnect', () => {
  console.log('❌ 与服务器的连接已断开。');
});

