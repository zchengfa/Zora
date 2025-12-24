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
  const {activeCustomerInfo,customerStaff} = useMessageStore()
  const msgRef = useRef<HTMLDivElement>(null);
  const isVisible = useInViewport(msgRef)
  const [avatar,setAvatar] = useState('')
  const [username,setUsername] = useState('')
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
        <div className={ZoraMessageItemStyle.msgStatusSvgBox}></div>
        {
          itemData.senderType === 'CUSTOMER' ? null :
            <span className={ZoraMessageItemStyle.zoraMsgReadState}>已读</span>
        }
      </div>
    </div>
  </div>
}

export default ZoraMessageItem
