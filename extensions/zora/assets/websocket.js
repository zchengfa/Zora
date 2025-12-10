const socket = io('wss://163d6c873351.ngrok-free.app',{
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
})

// 监听来自服务器的事件，例如 'message'
socket.on('message', (data) => {
  console.log('收到服务器消息:', data);
});

// 监听连接断开事件
socket.on('disconnect', () => {
  console.log('❌ 与服务器的连接已断开。');
});

// class ZoraSocket {
//   constructor(url, options = {}) {
//     // WebSocket 服务器地址
//     this.url = url;
//
//     // 配置选项
//     this.options = {
//       // 自动重连配置
//       autoReconnect: options.autoReconnect !== false, // 默认开启自动重连
//       maxReconnectAttempts: options.maxReconnectAttempts || 5, // 最大重连次数
//       reconnectInterval: options.reconnectInterval || 3000, // 重连间隔(ms)
//
//       // 心跳配置
//       heartbeat: options.heartbeat !== false, // 默认开启心跳
//       heartbeatInterval: options.heartbeatInterval || 10000, // 心跳间隔(ms)
//       heartbeatMsg: options.heartbeatMsg || JSON.stringify({ type: 'PING' }), // 心跳消息
//
//       ...options
//     };
//
//     // WebSocket 实例
//     this.ws = null;
//
//     // 状态管理
//     this.reconnectAttempts = 0; // 当前重连次数
//     this.isManualClose = false; // 是否手动关闭
//     this.reconnecting = false; // 是否正在重连
//     this.messageQueue = []; // 消息队列（连接未建立时暂存消息）
//
//     // 计时器
//     this.heartbeatTimer = null; // 心跳计时器
//     this.reconnectTimer = null; // 重连计时器
//
//     // 事件监听器存储
//     this.eventListeners = {
//       open: [],
//       message: [],
//       close: [],
//       error: [],
//       reconnect: [],
//       maxReconnectAttemptsReached: []
//     };
//
//     // 自动连接
//     if (this.options.autoConnect !== false) {
//       this.connect();
//     }
//   }
//
//   /**
//    * 建立 WebSocket 连接
//    */
//   connect() {
//     // 如果已有连接且状态为 OPEN 或 CONNECTING，则不再创建新连接
//     if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
//       console.warn('WebSocket 连接已存在或正在连接中');
//       return;
//     }
//
//     try {
//       this.ws = new WebSocket(this.url);
//       this.bindEvents();
//     } catch (error) {
//       console.error('创建 WebSocket 连接失败:', error);
//       this.handleError(error);
//     }
//   }
//
//   /**
//    * 绑定 WebSocket 事件
//    */
//   bindEvents() {
//     this.ws.onopen = (event) => this.handleOpen(event);
//     this.ws.onmessage = (event) => this.handleMessage(event);
//     this.ws.onclose = (event) => this.handleClose(event);
//     this.ws.onerror = (event) => this.handleError(event);
//   }
//
//   /**
//    * 处理连接打开事件
//    */
//   handleOpen(event) {
//     console.log('WebSocket 连接已建立');
//
//     // 重置重连次数
//     this.reconnectAttempts = 0;
//     this.reconnecting = false;
//
//     // 清空重连计时器
//     if (this.reconnectTimer) {
//       clearTimeout(this.reconnectTimer);
//       this.reconnectTimer = null;
//     }
//
//     // 发送消息队列中的消息
//     this.flushMessageQueue();
//
//     // 开始心跳检测
//     if (this.options.heartbeat) {
//       this.startHeartbeat();
//     }
//
//     // 触发 open 事件
//     this.trigger('open', event);
//   }
//
//   /**
//    * 处理消息接收事件
//    */
//   handleMessage(event) {
//     // 如果是心跳消息，不触发 message 事件
//     if (this.isHeartbeatMessage(event.data)) {
//       return;
//     }
//
//     this.trigger('message', event.data);
//   }
//
//   /**
//    * 处理连接关闭事件
//    */
//   handleClose(event) {
//     console.log(`WebSocket 连接已关闭，代码: ${event.code}, 原因: ${event.reason}`);
//
//     // 停止心跳检测
//     this.stopHeartbeat();
//
//     // 触发 close 事件
//     this.trigger('close', event);
//
//     // 非手动关闭且开启自动重连时，尝试重连
//     if (!this.isManualClose && this.options.autoReconnect) {
//       this.reconnect();
//     }
//   }
//
//   /**
//    * 处理错误事件
//    */
//   handleError(error) {
//     console.error('WebSocket 错误:', error);
//     this.trigger('error', error);
//   }
//
//   /**
//    * 自动重连逻辑
//    */
//   reconnect() {
//     if (this.reconnecting) return;
//
//     if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
//       this.reconnecting = true;
//       this.reconnectAttempts++;
//
//       console.log(`尝试第 ${this.reconnectAttempts} 次重连...`);
//       this.trigger('reconnect', this.reconnectAttempts);
//
//       // 设置重连计时器
//       this.reconnectTimer = setTimeout(() => {
//         this.reconnecting = false;
//         this.connect();
//       }, this.options.reconnectInterval);
//
//     } else {
//       console.error(`重连次数已达上限（${this.options.maxReconnectAttempts}次），停止重连`);
//       this.trigger('maxReconnectAttemptsReached', this.options.maxReconnectAttempts);
//     }
//   }
//
//   /**
//    * 发送消息
//    */
//   send(data) {
//     // 如果连接未打开，将消息加入队列
//     if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
//       this.messageQueue.push(data);
//       return false;
//     }
//
//     try {
//       this.ws.send(data);
//       return true;
//     } catch (error) {
//       console.error('发送消息失败:', error);
//       this.trigger('error', error);
//       return false;
//     }
//   }
//
//   /**
//    * 发送消息队列中的消息
//    */
//   flushMessageQueue() {
//     while (this.messageQueue.length > 0) {
//       const message = this.messageQueue.shift();
//       this.send(message);
//     }
//   }
//
//   /**
//    * 开始心跳检测
//    */
//   startHeartbeat() {
//     this.stopHeartbeat(); // 先停止现有心跳
//
//     this.heartbeatTimer = setInterval(() => {
//       if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//         this.ws.send(this.options.heartbeatMsg);
//       } else {
//         this.stopHeartbeat();
//       }
//     }, this.options.heartbeatInterval);
//   }
//
//   /**
//    * 停止心跳检测
//    */
//   stopHeartbeat() {
//     if (this.heartbeatTimer) {
//       clearInterval(this.heartbeatTimer);
//       this.heartbeatTimer = null;
//     }
//   }
//
//   /**
//    * 判断是否为心跳消息
//    */
//   isHeartbeatMessage(message) {
//     try {
//       const msg = JSON.parse(message);
//       return msg.type === 'PING' || msg.type === 'HEARTBEAT';
//     } catch {
//       return message === this.options.heartbeatMsg;
//     }
//   }
//
//   /**
//    * 手动关闭连接
//    */
//   close(code = 1000, reason = '') {
//     this.isManualClose = true;
//     this.stopHeartbeat();
//
//     if (this.reconnectTimer) {
//       clearTimeout(this.reconnectTimer);
//       this.reconnectTimer = null;
//     }
//
//     if (this.ws) {
//       this.ws.close(code, reason);
//     }
//   }
//
//   /**
//    * 获取连接状态
//    */
//   getReadyState() {
//     return this.ws ? this.ws.readyState : WebSocket.CLOSED;
//   }
//
//   /**
//    * 添加事件监听
//    */
//   on(event, callback) {
//     if (this.eventListeners[event]) {
//       this.eventListeners[event].push(callback);
//     } else {
//       console.warn(`未知事件类型: ${event}`);
//     }
//   }
//
//   /**
//    * 移除事件监听
//    */
//   off(event, callback) {
//     if (this.eventListeners[event]) {
//       if (callback) {
//         this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
//       } else {
//         this.eventListeners[event] = [];
//       }
//     }
//   }
//
//   /**
//    * 触发事件
//    */
//   trigger(event, data) {
//     if (this.eventListeners[event]) {
//       this.eventListeners[event].forEach(callback => {
//         try {
//           callback(data);
//         } catch (error) {
//           console.error(`执行事件 ${event} 的回调函数时出错:`, error);
//         }
//       });
//     }
//   }
// }
