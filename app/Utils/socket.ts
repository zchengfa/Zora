import io from "socket.io-client";
export const zoraSocket = (url:string)=>{
  const socket = io(url,{
    headers: {
      "ngrok-skip-browser-warning": 'true'
    },
    transports: ['websocket']
  });
// 监听连接成功事件
  socket.on('connect', () => {
    console.log('✅ 已成功连接到服务器！');
    socket.emit('agent')
  });
// 消息接收
  socket.on('message', (data) => {
    console.log('收到服务器消息:', data)
    socket.emit('message_delivered',{
      type: 'ACK',
      senderType: 'AGENT',
      code: 'message delivered',
      recipientId: data.senderId,
      msgId: data.msgId,
      timestamp: new Date().toISOString()
    })
  });

// 监听连接断开事件
  socket.on('disconnect', () => {
    console.log('❌ 与服务器的连接已断开。');
  });

  return socket;
}
