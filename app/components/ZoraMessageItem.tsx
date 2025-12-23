import ZoraMessageItemStyle from '@styles/componentStyles/ZoraMessageItem.module.scss'
import React from "react";
import {MessageDataType} from "@Utils/socket.ts";
import {useMessageStore} from "@/zustand/zustand.ts";

interface ZoraMsgItemPropsType {
  itemData: MessageDataType
}

const ZoraMessageItem:React.FC<ZoraMsgItemPropsType> = (
  {
    itemData
  }
)=>{
  const messageStore = useMessageStore()

  return <div
    className={itemData.senderType === 'CUSTOMER' ? ZoraMessageItemStyle.zoraMessageItem + ' ' + ZoraMessageItemStyle.zoraMessageLeft : ZoraMessageItemStyle.zoraMessageItem + ' ' + ZoraMessageItemStyle.zoraMessageRight}>
    <div className={ZoraMessageItemStyle.zoraMessageAvatar}>
      <img className={ZoraMessageItemStyle.zoraAvatar} width="32px" height="32px"
           src={messageStore.activeCustomerInfo.avatar} alt="zora_avatar"/>
    </div>
    <div className={ZoraMessageItemStyle.zoraMsgBox}>
      <span className={ZoraMessageItemStyle.zoraUser}>{messageStore.activeCustomerInfo.username}</span>
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
