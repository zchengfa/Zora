import {LoaderFunctionArgs, useLoaderData} from "react-router";
import {authenticate} from "@/shopify.server";
import indexStyle from '@styles/pages/app_index.module.scss'
import ZoraSearch from '@components/ZoraSearch'
import ZoraCustomerList from '@components/ZoraCustomerList'
import ZoraMessageItems from "@components/ZoraMessageItems";
import ZoraChat from "@components/ZoraChat.tsx";
import {useSocketService} from "@hooks/useSocketService.ts";
import {useEffect} from "react";
import {useMessageStore} from "@/zustand/zustand.ts";
import {shopifyRequestUserInfo} from "@/network/request.ts";

export const loader = async ({request}:LoaderFunctionArgs)=>{
  await authenticate.admin(request)
  const params = request.url.substring(request.url.indexOf('?'),request.url.length)

  return {
    params
  }
  // return shopifyRequestUserInfo(params)
  // const result = await admin.graphql(
  //   `query shopInfo {
  //     shop {
  //       myshopifyDomain
  //     }
  //     products(first:100) {
  //       nodes {
  //         id
  //         title
  //       }
  //     }
  //   }
  //   `
  // )

  //return await requestUserInfo()
}

function Index(){
  const {params} = useLoaderData<typeof loader>();
  // const products = result?.data?.products?.nodes;
  const {message} = useSocketService();
  const messageStore = useMessageStore();

  useEffect(() => {
    messageStore.initZustandState()
    messageStore.initMessages(JSON.parse(sessionStorage.getItem('zora_active_item') as string)).then()
  }, []);

  useEffect(() => {
    if(message){
      let isExistUser = false
      const userList = messageStore.chatList
      if(!userList.length){
        isExistUser = false
      }
      else{
        userList.forEach(user=>{
          isExistUser =  user.id === message.senderId
        })
      }
      //列表不存在该客户信息，需要新增客户聊天列表项
      if(!isExistUser){
        shopifyRequestUserInfo(params+'&id='+message.senderId).then(res=>{
          const {userInfo} = res.data
          messageStore.pushChatList({
            id:userInfo.id,
            firstName: userInfo.first_name,
            lastName: userInfo.last_name,
            avatar: userInfo.image_url,
            lastMessage: message.contentBody,
            conversationId: message.conversationId,
            lastTimestamp: message.timestamp
          })
          messageStore.addMessage(message)
        }).catch(err=>{
            console.log(err)
          })
      }
      //存在，只需更新对应列表项的部分数据
      else{
        messageStore.updateChatList(message)
        messageStore.addMessage(message)
      }

    }
  }, [message]);

  const customerItemClick = async (conversationId:string)=>{
    if(messageStore.activeCustomerItem !== conversationId){
      messageStore.readChatList(conversationId)
      await messageStore.changeMessages({
        conversationId,
        page:messageStore.page,
        pageSize: messageStore.pageSize
      })
    }
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
          {/*客户列表*/}
          <div className={indexStyle.chatLeft}>
            <ZoraSearch placeholder={'Search'}></ZoraSearch>
            <ZoraCustomerList customerData={messageStore.chatList} ItemClick={customerItemClick}></ZoraCustomerList>
          </div>
          {/*聊天部分*/}
          <div className={indexStyle.chatMiddle}>
            <ZoraMessageItems messageData={messageStore.messages}></ZoraMessageItems>
            <ZoraChat ></ZoraChat>
          </div>
          <div className={indexStyle.chatRight}></div>
        </div>
      </div>
    </div>
  </div>
}

export default Index
