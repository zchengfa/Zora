import SocketService, {MessageDataType, NotificationDataType} from "@Utils/socket.ts";
import {useEffect,useState} from "react";
const socketService = new SocketService({url:import.meta.env.VITE_BASE_URL.replace('https','wss')});
socketService.connect()
export const useSocketService = ()=>{
  const [message,setMessage] = useState<MessageDataType | null>(null)
  const [messageAck, setMessageAck] = useState(null)
  const [notification, setNotification] = useState<NotificationDataType | null>(null)

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

    socketService.on('message', handleMessage)
    socketService.on('message_ack',handleMessageAck)
    socketService.on('notification', handleNotification)

    return ()=>{
      socketService.off('message', handleMessage)
      socketService.off('message_ack', handleMessageAck)
      socketService.off('notification', handleNotification)
    }
  })
  return {message,socket:socketService,messageAck,notification}
}
