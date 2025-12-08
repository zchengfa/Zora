import io from "socket.io-client";
export const zoraSocket = (url:string)=>{
  const socket = io(url,{
    headers: {
      "ngrok-skip-browser-warning": 'true'
    }
  });
// 监听连接成功事件
  socket.on('connect', () => {
    console.log('✅ 已成功连接到服务器！');
  });

  socket.on('test',(data)=>{
    console.log('test:'+ data)
  })

// 监听来自服务器的事件，例如 'message'
  socket.on('message', (data) => {
    console.log('收到服务器消息:', data);
  });

// 监听连接断开事件
  socket.on('disconnect', () => {
    console.log('❌ 与服务器的连接已断开。');
  });

  return socket;
}
