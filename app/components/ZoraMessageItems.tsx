import React, {useEffect, useRef} from "react";
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

  const msgIntoRef = useRef(null);

  const scrollToBottom = ()=>{
    msgIntoRef?.current?.scrollIntoView({behavior: "smooth"});
  }

  useEffect(() => {
    //消息更新自动滚动到底部
    scrollToBottom()
  }, [messageData]);

  return <div className={ZoraMessageItemsStyle.container}>
    {
      messageData?.length ?
        <div className={ZoraMessageItemsStyle.messageBox}>
          {
            messageData.map((item:MessageDataType,index:number)=>{
              return <ZoraMessageItem itemData={item} key={item.conversationId+index}></ZoraMessageItem>
            })
          }
          <div className="msg-into-ref" ref={msgIntoRef}></div>
        </div>
        : <span>no message</span>
    }
  </div>
}

export default ZoraMessageItems;
