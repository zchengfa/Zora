import SocketService, {MessageDataType, NotificationDataType} from "@Utils/socket.ts";
import {useEffect,useState} from "react";

// 发货消息类型
export type OrderFulfillmentDataType = {
  type: 'fulfillment_success' | 'fulfillment_failure' | 'insufficient_inventory';
  orderId: string;
  shop: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  error?: string;
  customerStaffId: string;
  timestamp: string;
}

const socketService = new SocketService({url:import.meta.env.VITE_BASE_URL.replace('https','wss')});
socketService.connect()

export const useSocketService = ()=>{
  const [message,setMessage] = useState<MessageDataType | null>(null)
  const [messageAck, setMessageAck] = useState(null)
  const [notification, setNotification] = useState<NotificationDataType | null>(null)
  const [offlineMessages, setOfflineMesages] = useState<MessageDataType[] | null>(null)
  const [orderFulfillment, setOrderFulfillment] = useState<OrderFulfillmentDataType | null>(null)

  useEffect(()=>{
    if(typeof window === 'undefined') return ;

    const handleMessage = (data:MessageDataType)=>{
      setMessage(data)
    }

    const handleMessageAck = (ack)=>{
      setMessageAck(ack)
    }

    const handleNotification = (data:NotificationDataType)=>{
      setNotification(data)
    }

    const handleOfflineMessages = (data:MessageDataType[])=>{
      setOfflineMesages(data)
    }

    const handleOrderFulfillment = (data:OrderFulfillmentDataType)=>{
      setOrderFulfillment(data)
    }

    socketService.on('message', handleMessage)
    socketService.on('message_ack',handleMessageAck)
    socketService.on('notification', handleNotification)
    socketService.on('offline_messages',handleOfflineMessages)
    socketService.on('order_fulfillment', handleOrderFulfillment)

    return ()=>{
      socketService.off('message', handleMessage)
      socketService.off('message_ack', handleMessageAck)
      socketService.off('notification', handleNotification)
      socketService.off('offline_messages',handleOfflineMessages)
      socketService.off('order_fulfillment', handleOrderFulfillment)
    }
  })
  return {message,socket:socketService,messageAck,notification,offlineMessages,orderFulfillment}
}
