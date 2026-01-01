import React, {useEffect, useRef} from "react";
import ZoraMessageItemsStyle from '@styles/componentStyles/ZoraMessageItems.module.scss'
import ZoraMessageItem from "@components/ZoraMessageItem"
import {MessageDataType} from "@Utils/socket.ts";
import ZoraEmpty from "@components/common/ZoraEmpty.tsx";

interface MessagePropsType{
  messageData: MessageDataType[];
}

const ZoraMessageItems:React.FC<MessagePropsType> = (
  {
    messageData
  })=>{

  const msgIntoRef = useRef<HTMLElement | null>(null);

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
        : <ZoraEmpty isEmptyMessage={true}></ZoraEmpty>
    }
  </div>
}

export default ZoraMessageItems;
