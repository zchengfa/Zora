import ZoraCustomerListStyle from '../styles/componentStyles/ZoraCustomerList.module.scss'
import type {CustomerDataType} from '../type'
import Badge from "./common/Badge";
import React, {useState} from "react";
import ZoraTimestamp from "./common/ZoraTimestamp";

interface ZoraCustomerListProps {
  customerData: CustomerDataType[],
  ItemClick:(index:number)=> void
}


const ZoraCustomerList:React.FC<ZoraCustomerListProps> = (
  {customerData,ItemClick}
) => {

  const handlerClick = (index:number)=>{
    ItemClick(index)
  }

  return <div className={ZoraCustomerListStyle.container}>
    {
      customerData?.length ?
        <div className={ZoraCustomerListStyle.customerList}>
          {
            customerData?.map((item: CustomerDataType, index: number) => {
              return <div onClick={()=> handlerClick(index)} className={item.isActive ? ZoraCustomerListStyle.customerItem + ' ' + ZoraCustomerListStyle.active : ZoraCustomerListStyle.customerItem} key={index}>
                <div className={item.isOnline ? ZoraCustomerListStyle.leftBox + ' '+ ZoraCustomerListStyle.onlineTip  :  ZoraCustomerListStyle.leftBox}>
                  {
                    item.avatar ? <img className={ZoraCustomerListStyle.avatar} src={item.avatar} alt="avatar" />
                      : <img className={ZoraCustomerListStyle.avatar} src={'/assets/default_avatar.jpg'} alt='default_avatar'/>
                  }
                </div>
                <div className={ZoraCustomerListStyle.middleBox}>
                  <span className={ZoraCustomerListStyle.username}>{item.firstName + item.lastName}</span>
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
        : <span className={ZoraCustomerListStyle.emptyData}>no customers</span>
    }
  </div>
}

export default ZoraCustomerList
