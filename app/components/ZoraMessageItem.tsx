import ZoraMessageItemStyle from '@styles/componentStyles/ZoraMessageItem.module.scss'
import React, {useEffect, useRef, useState} from "react";
import {MessageDataType} from "@Utils/socket.ts";
import {useMessageStore} from "@/zustand/zustand.ts";
import {useInViewport} from "@hooks/useInViewport.ts";

interface ZoraMsgItemPropsType {
  itemData: MessageDataType
}

const ZoraMessageItem:React.FC<ZoraMsgItemPropsType> = (
  {
    itemData
  }
)=>{
  const {activeCustomerInfo,customerStaff,messageTimers} = useMessageStore()
  const msgRef = useRef<HTMLDivElement>(null);
  const isVisible = useInViewport(msgRef)
  const [avatar,setAvatar] = useState('')
  const [username,setUsername] = useState('')
  const [msgReadStatus,setMsgReadStatus] = useState<string>('')
  useEffect(() => {
    if(itemData.senderType === 'CUSTOMER'){
      setAvatar(activeCustomerInfo.avatar)
      setUsername(activeCustomerInfo.username)
    }
    else{
      setAvatar(customerStaff.avatarUrl)
      setUsername(customerStaff.name)
    }
  }, []);

  useEffect(() => {
    if(itemData.msgStatus === 'READ'){
      setMsgReadStatus('已读')
    }
    else if(itemData.msgStatus === 'DELIVERED'){
      setMsgReadStatus('未读')
    }
  }, [itemData.msgStatus]);

  return <div ref={msgRef} style={{visibility: isVisible ? "visible" : "hidden"}}
    className={itemData.senderType === 'CUSTOMER' ? ZoraMessageItemStyle.zoraMessageItem + ' ' + ZoraMessageItemStyle.zoraMessageLeft : ZoraMessageItemStyle.zoraMessageItem + ' ' + ZoraMessageItemStyle.zoraMessageRight}>
    <div className={ZoraMessageItemStyle.zoraMessageAvatar}>
      <img className={ZoraMessageItemStyle.zoraAvatar} width="32px" height="32px"
           src={avatar} alt="zora_avatar"/>
    </div>
    <div className={ZoraMessageItemStyle.zoraMsgBox}>
      <span className={ZoraMessageItemStyle.zoraUser}>{username}</span>
      <div className={ZoraMessageItemStyle.zoraMsgContent}>
        <span className={ZoraMessageItemStyle.zoraMsg}>{itemData.contentBody}</span>
        {
          itemData.msgStatus === 'SENDING' && itemData.senderType === 'AGENT' ?
            <div className={ZoraMessageItemStyle.msgStatusSvgBox}>
              <svg className={'icon' + ' ' + ZoraMessageItemStyle.loadingIcon + ' ' + ZoraMessageItemStyle.loading} viewBox="0 0 1024 1024" version="1.1"
                   xmlns="http://www.w3.org/2000/svg" width="1em" height="1em">
                <path
                  d="M512 0a512.170667 512.170667 0 0 1 504.917333 426.666667H930.133333A426.837333 426.837333 0 0 0 85.333333 512a426.666667 426.666667 0 0 0 844.8 85.418667h86.784A512.170667 512.170667 0 0 1 0 512a512 512 0 0 1 512-512z"
                  fill="#bfbfbf" ></path>
              </svg>
            </div> : null
        }
        {
          itemData.senderType === 'AGENT' && itemData.msgStatus === 'FAILED' ?
            <div className={ZoraMessageItemStyle.msgStatusSvgBox}>
              <svg className={'icon' + ' '+ ZoraMessageItemStyle.failedIcon} viewBox="0 0 1024 1024" version="1.1"
                   xmlns="http://www.w3.org/2000/svg" width="1em" height="1em">
                <path d="M512.8 512m-423 0a423 423 0 1 0 846 0 423 423 0 1 0-846 0Z" fill="#FF7575"></path>
                <path
                  d="M481.3 590.7c5.3 15.8 15.8 26.2 31.5 26.2 15.8 0 26.2-10.5 31.5-26.2l21-288.7c0-31.5-26.2-52.5-52.5-52.5-31.5 0-52.5 26.2-52.5 57.8l21 283.4z m31.5 78.8c-31.5 0-52.5 21-52.5 52.5s21 52.5 52.5 52.5 52.5-21 52.5-52.5-21-52.5-52.5-52.5z m0 0"
                  fill="#FFFFFF"></path>
              </svg>
            </div> : null
        }
        {
          itemData.msgStatus === 'DELIVERED' || itemData.msgStatus === 'READ' ?
            <span className={ZoraMessageItemStyle.zoraMsgReadState}>{msgReadStatus}</span> : null
        }
      </div>
    </div>
  </div>
}

export default ZoraMessageItem
