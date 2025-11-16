import type {LoaderFunctionArgs} from "react-router";
import {useLoaderData} from "react-router";
import {authenticate} from "../shopify.server";

import indexStyle from '../styles/pages/app_index.module.scss'
import ZoraSearch from '../components/ZoraSearch'
import ZoraCustomerList from '../components/ZoraCustomerList'
import {useState} from "react";
import type {CustomerDataType} from "../type";

export const loader = async ({request}:LoaderFunctionArgs)=>{
  const {admin} = await authenticate.admin(request)
  const result = await admin.graphql(
    `query shopInfo {
      shop {
        myshopifyDomain
      }
      products(first:100) {
        nodes {
          id
          title
        }
      }
    }
    `
  )

  return await result.json()
}

export default function Index(){
  const result = useLoaderData<typeof loader>();
  const products = result?.data?.products?.nodes;
  //客户信息列表数据
  const [userData,setUserData] = useState([
    {
      id: (new Date().getTime()).toString(),
      firstName:'z',
      lastName:'raylin',
      avatar:null,
      isOnline:true,
      lastMessage:'helloememememeemememememem',
      lastTimestamp:(new Date().getTime()).toString(),
      hadRead:false,
      isActive:false,
      unreadMessageCount:1
    },
    {
      id: (new Date().getTime()).toString(),
      firstName:'z',
      lastName:'Alin',
      avatar:null,
      isOnline:false,
      lastMessage:'em',
      lastTimestamp:'1677777777777',
      hadRead:false,
      isActive:false,
      unreadMessageCount:101
    }
  ])

  const customerItemClick = (index:number)=>{
    //点击对应的客户项，修改成已读并使其变为激活状态,未读信息数也要清零
    const data = JSON.parse(JSON.stringify(userData))
    data.forEach((item:CustomerDataType,i:number)=>{
      if(i === index){
        item.hadRead = true
        item.isActive = true
        item.unreadMessageCount = 0
      }
      else{
        item.isActive = false
      }
    })

    setUserData(data)
  }

  return <div className={indexStyle.container}>
    <div className={indexStyle.content}>
      <div className={indexStyle.statusBox}>
        <span className={indexStyle.tipSpan}>Status:</span>
        <div className={indexStyle.tipBox}>
          <span className={indexStyle.status}>Online</span>
        </div>
      </div>
      <div className={indexStyle.chatContent}>
        <h3 className={indexStyle.chatTitle}>chat</h3>
        <div className={indexStyle.chatBox}>
          <div className={indexStyle.chatLeft}>
            <ZoraSearch placeholder={'Search'}></ZoraSearch>
            <ZoraCustomerList customerData={userData} ItemClick={customerItemClick}></ZoraCustomerList>
          </div>
          <div className={indexStyle.chatMiddle}></div>
          <div className={indexStyle.chatRight}></div>
        </div>
      </div>
    </div>
  </div>
}

