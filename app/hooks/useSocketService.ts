import SocketService, {MessageDataType} from "@Utils/socket.ts";
import {useEffect,useState,useRef} from "react";

export const useSocketService = ()=>{
  const [message,setMessage] = useState<MessageDataType | null>(null)
  const [messageAck, setMessageAck] = useState(null)
  const socketRef = useRef<SocketService | null>(null);

  useEffect(()=>{
    if(typeof window === 'undefined') return ;

    if (!socketRef.current){
      const socket = new SocketService({url:import.meta.env.VITE_BASE_URL.replace('https','wss')});
      socket.connect()
      socketRef.current = socket
    }
    const handleMessage = (data:MessageDataType)=>{
      setMessage(data)
    }

    const socketService = socketRef.current

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
  return {message,socket:socketRef.current,messageAck}
}
