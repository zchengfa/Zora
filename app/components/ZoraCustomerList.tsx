import ZoraCustomerListStyle from '@styles/componentStyles/ZoraCustomerList.module.scss'
import type {CustomerDataType} from '@/type'
import Badge from "@components/common/Badge";
import React from "react";
import ZoraTimestamp from "@components/common/ZoraTimestamp";
import ZoraEmpty from "@components/common/ZoraEmpty.tsx";

interface ZoraCustomerListProps {
  customerData: CustomerDataType[],
  ItemClick:(conversationId:string)=> void
}


const ZoraCustomerList:React.FC<ZoraCustomerListProps> = (
  {customerData,ItemClick}
) => {

  const handlerClick = (conversationId:string)=>{
    ItemClick(conversationId)
  }

  return <div className={ZoraCustomerListStyle.container}>
    {
      customerData?.length ?
        <div className={ZoraCustomerListStyle.customerList}>
          {
            customerData?.map((item: CustomerDataType) => {
              return <div onClick={()=> handlerClick(item.conversationId)} className={item.isActive ? ZoraCustomerListStyle.customerItem + ' ' + ZoraCustomerListStyle.active : ZoraCustomerListStyle.customerItem} key={item.conversationId}>
                <div className={item.isOnline ? ZoraCustomerListStyle.leftBox + ' '+ ZoraCustomerListStyle.onlineTip  :  ZoraCustomerListStyle.leftBox}>
                  {
                    item.avatar ? <img className={ZoraCustomerListStyle.avatar} src={item.avatar} alt="avatar" />
                      : <img className={ZoraCustomerListStyle.avatar} src={'/assets/default_avatar.jpg'} alt='default_avatar'/>
                  }
                </div>
                <div className={ZoraCustomerListStyle.middleBox}>
                  <span className={`${ZoraCustomerListStyle.username} multi-line-ellipsis`}>{item.firstName + item.lastName}</span>
                  <span className={ZoraCustomerListStyle.message}>{item.lastMessage}</span>
                </div>
                <div className={ZoraCustomerListStyle.rightBox}>
                  <div className={ZoraCustomerListStyle.timeBox}>
                    <ZoraTimestamp timestamp={item.lastTimestamp}></ZoraTimestamp>
                  </div>
                  {
                    item.hadRead ? null : <Badge count={item.unreadMessageCount}></Badge>
                  }
                </div>
              </div>
            })
          }
        </div>
        : <ZoraEmpty isEmptyMessage={false}></ZoraEmpty>
    }
  </div>
}

export default ZoraCustomerList
