import {create} from "zustand/react";
import {deepCloneTS} from "@Utils/Utils.ts";

export const useMessageStore = create((set)=>{
    return {
      message: '',
      chatList: [],
      addMessage: (payload) => {
        set(()=>{
          console.log(payload,'from zustand')
            return {
              message:payload,
            }
        })
      },
      pushChatList:(payload)=>{
        set((state)=>{
          const newChatList = deepCloneTS(state.chatList);
          newChatList.push({
            id: payload.id,
            firstName:payload.firstName,
            lastName:payload.lastName,
            avatar:payload.avatar,
            isOnline:true,
            lastMessage:payload.lastMessage,
            lastTimestamp:(new Date().getTime()).toString(),
            hadRead:false,
            isActive:false,
            unreadMessageCount:1
          })
          return {
            chatList:newChatList,
          }
        })
      }
    }
  }
)
