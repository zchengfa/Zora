import type {MessageBoxType} from "@/type";
import React from "react";


interface ZoraMsgItemPropsType {
  itemData: MessageBoxType
}

const ZoraMessageItem:React.FC<ZoraMsgItemPropsType> = (
  {
    itemData
  }
)=>{
  return <div>{itemData.content?.body}</div>
}

export default ZoraMessageItem
