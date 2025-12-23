import React from "react";
import ZoraMessageItemsStyle from '@styles/componentStyles/ZoraMessageItems.module.scss'
import ZoraMessageItem from "@components/ZoraMessageItem"
import {MessageDataType} from "@Utils/socket.ts";

interface MessagePropsType{
  messageData: MessageDataType[];
}

const ZoraMessageItems:React.FC<MessagePropsType> = (
  {
    messageData
  })=>{
  return <div className={ZoraMessageItemsStyle.container}>
    {
      messageData?.length ?
        <div className={ZoraMessageItemsStyle.messageBox}>
          {
            messageData.map((item:MessageDataType,index:number)=>{
              return <ZoraMessageItem itemData={item} key={item.conversationId+index}></ZoraMessageItem>
            })
          }
        </div>
        : <span>no message</span>
    }
  </div>
}

export default ZoraMessageItems;
