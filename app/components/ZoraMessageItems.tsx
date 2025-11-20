import React from "react";
import type {MessageBoxType} from "@/type";
import ZoraMessageItemsStyle from '@styles/componentStyles/ZoraMessageItems.module.scss'
import ZoraMessageItem from "@components/ZoraMessageItem"

interface MessagePropsType{
  messageData: MessageBoxType[];
}

const ZoraMessageItems:React.FC<MessagePropsType> = (
  {
    messageData
  })=>{
  return <div className={ZoraMessageItemsStyle.contanier}>
    {
      messageData?.length ?
        <div className={ZoraMessageItemsStyle.messageBox}>
          {
            messageData.map((item:MessageBoxType,index:number)=>{
              return <ZoraMessageItem itemData={item} key={index}></ZoraMessageItem>
            })
          }
        </div>
        : <span>no message</span>
    }
  </div>
}

export default ZoraMessageItems;
