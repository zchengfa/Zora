import SocketService, {MessageDataType} from "@Utils/socket.ts";
import {useEffect,useState} from "react";

const socketService = new SocketService({url:import.meta.env.VITE_BASE_URL.replace('https','wss')});
socketService.connect()
export const useSocketService = ()=>{
  const [message,setMessage] = useState<MessageDataType | null>(null)
  const [messageAck, setMessageAck] = useState(null)
  useEffect(()=>{
    const handleMessage = (data:MessageDataType)=>{
      socketService.emit('message_delivered',{
        type: 'ACK',
        senderType: 'AGENT',
        recipientId: data.senderId,
        msgId: data.msgId,
      })
      setMessage(data)
    }

    const handleMessageAck = (ack)=>{
      setMessageAck(ack)
    }
    socketService.on('message', handleMessage)
    socketService.on('message_ack',handleMessageAck)

    return ()=>{
      socketService.off('message', handleMessage)
      socketService.off('message_ack', handleMessageAck)
    }
  })
  return {message,socket:socketService,messageAck}
}
