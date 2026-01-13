import {io, ManagerOptions, SocketOptions,Socket} from "socket.io-client";

export type MessageDataType = {
  contentBody: string ,
  contentType: 'TEXT' | 'PRODUCT_CARD' | 'IMAGE',
  conversationId:string,
  msgId:string,
  msgStatus: 'SENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'READ' | "",
  recipientType: 'CUSTOMER' | 'AGENT' ,
  recipientId: string,
  senderId:string
  senderType: 'CUSTOMER' | 'SYSTEM' | 'AGENT',
  timestamp: string | number,
  timer?: number | undefined
}

// 定义一个接口来描述可能的配置项，如果有需要的话
interface SocketConfig {
  // 这里可以根据实际情况添加更多配置项，比如重连策略等
  url: string;
  options?: Partial<ManagerOptions & SocketOptions>; // 可以更精确地定义options的类型，这里暂时用any
}

class SocketService {
  private socket: Socket | null = null;

  constructor(private config: SocketConfig) {}

  connect() {
    this.socket = io(this.config.url, {
      headers: {
        "ngrok-skip-browser-warning": 'true'
      },
      transports: ['websocket'],
      ...this.config.options
    });
    this.socket.on('disconnect', () => {
      console.log('❌ 与服务器的连接已断开。');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(eventName: string, data?: any) {
    if (this.socket) {
      this.socket.emit(eventName, data);
    } else {
      console.warn('Socket is not connected. Cannot emit event:', eventName);
    }
  }

  on(eventName: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    } else {
      console.warn('Socket is not connected. Cannot listen for event:', eventName);
    }
  }

  off(eventName: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }
}

export default SocketService;

