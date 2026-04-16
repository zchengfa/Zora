import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import {useAppBridge} from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris"
import en from "@shopify/polaris/locales/en.json"
import { authenticate } from "@/shopify.server.ts";
import ZoraModalProvider from "@/contexts/ZoraModalProvider.tsx";
import ZoraNotificationProvider from "@/contexts/ZoraNotificationProvider.tsx";

import  '@styles/_variables.scss'
import  '@styles/base.scss'

import {useEffect} from "react";
import {useSocketService} from "@hooks/useSocketService.ts";
import {useMessageStore} from "@/zustand/zustand.ts";
import {useAppTranslation} from "@hooks/useAppTranslation.ts";
import {useZoraNotification} from "@/contexts/ZoraNotificationProvider";
import {MessageDataType} from "@Utils/socket.ts";
import {shopifyRequestUserInfo, shopifyCustomerStaffInit} from "@/network/request.ts";
import {SHOP_INFO_QUERY_GQL, PRODUCTS_QUERY_GQL} from "@Utils/graphql.ts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {admin} = await authenticate.admin(request)
  let params = request.url.substring(request.url.indexOf('?'),request.url.length)
  if(!params.includes('hmac')){
    params = ''
  }
  const shopOwnerName = await admin.graphql(SHOP_INFO_QUERY_GQL)
  const response = await  admin.graphql(PRODUCTS_QUERY_GQL, {variables:{first: 10}})
  const result = await response.json()

  const {data} = await shopOwnerName.json()
  let customerStaff;
  try {
    const result = await shopifyCustomerStaffInit(params,data.shop.email,data.shop.shopOwnerName,data.shop.myshopifyDomain)
    customerStaff = result?.data
  }
  catch (e) {
    customerStaff = null
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    params,
    customerStaff,
    products:result?.data,
  };
};

// 内部组件，用于在ZoraNotificationProvider内部使用useSocketNotification
function AppContent({ notification, orderFulfillment }: { notification: any; orderFulfillment: any }) {
  const { showNotification, showSuccess, showError, showWarning } = useZoraNotification();
  const {translation} = useAppTranslation();
  const t = translation.components.notification.fulfillment;

  useEffect(() => {
    if (notification) {
      showNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        duration: notification.duration,
      });
    }
  }, [notification, showNotification]);

  useEffect(() => {
    if(orderFulfillment){
      switch(orderFulfillment.type){
        case 'fulfillment_success':
          showSuccess(
            t.success.message
              .replace('{orderId}', orderFulfillment.orderId)
              .replace('{trackingNumber}', orderFulfillment.trackingNumber || ''),
            t.success.title
          );
          break;
        case 'fulfillment_failure':
          showError(
            t.failure.message
              .replace('{orderId}', orderFulfillment.orderId)
              .replace('{error}', orderFulfillment.error || ''),
            t.failure.title
          );
          break;
        case 'insufficient_inventory':
          showWarning(
            t.insufficientInventory.message.replace('{orderId}', orderFulfillment.orderId),
            t.insufficientInventory.title
          );
          break;
      }
    }
  }, [orderFulfillment, showSuccess, showError, showWarning, t]);

  return <Outlet/>;
}

function App() {
  const { apiKey, customerStaff, products,params } = useLoaderData<typeof loader>();
  const {message,socket,messageAck,offlineMessages,notification,orderFulfillment} = useSocketService();

  const appBridge = useAppBridge()
  const {translation} = useAppTranslation();
  const t = translation.sidebar;

  const messageStore = useMessageStore();
  const {customerStaff: storeCustomerStaff, chatList, activeCustomerItem} = messageStore;

  // 初始化customerStaff和products数据到zustand
  useEffect(() => {
    if (customerStaff && products) {
      messageStore.initGlobalState(customerStaff, products);
      // 初始化聊天状态
      messageStore.initChatState();
    }
  }, [customerStaff, products]);

  useEffect(() => {
    const setTheme = ()=>{
      const localStorageTheme = localStorage.getItem('zora_application_theme');
      const zustandTheme = messageStore.settings.theme;
      const currentTheme = localStorageTheme || zustandTheme || 'light';
      document.getElementsByTagName('html')[0].setAttribute('data-theme', currentTheme);
    }
    setTheme()

  },[messageStore.settings.theme, messageStore.customerStaff])

  useEffect(() => {
    const handleBeforeUnload = () => {
      // 通过socket发送下线通知
      socket.emit('offline',{
        id: customerStaff.id,
        chatList: chatList,
        activeCustomerItem: activeCustomerItem
      })
    }

// 处理 iframe 被卸载（在 Shopify Admin 内切换页面）
    const handleUnload = () => {
      const logoutData = new Blob([JSON.stringify({
        agent: customerStaff?.id,
        action: 'offline_via_unload',
        chatList: chatList,
        activeCustomerItem: activeCustomerItem
      })], { type: 'application/json' });
      navigator.sendBeacon(`${import.meta.env.VITE_BASE_URL}/api/agent-offline`, logoutData);
    };

    window.addEventListener('unload', handleUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // 清理时移除两个事件的监听
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };

  },[socket,customerStaff,chatList,activeCustomerItem])

  // 处理消息回执
  useEffect(() => {
    if(messageAck){
      const {updateMessageStatus,clearUpTimer} = useMessageStore.getState();
      //收到回执，更新消息状态
      updateMessageStatus(messageAck);
      clearUpTimer(messageAck);
    }
  }, [messageAck]);

  // 处理新消息
  useEffect(() => {
    if(message){
      const messageStore = useMessageStore.getState();
      const {pushChatList,updateChatList,addMessage} = messageStore;
      let isExistUser = false
      const userList = messageStore.chatList
      if(!userList.length){
        isExistUser = false
      }
      else{
        userList.forEach(user=>{
          if(user.id === message.senderId){
            isExistUser = true
          }
        })
      }

      //列表不存在该客户信息，需要新增客户聊天列表项
      if(!isExistUser){
        shopifyRequestUserInfo(params.toString() ? params.toString()+'&id='+message.senderId : `?id=${message.senderId}`).then(res=>{
          const {userInfo} = res.data
          pushChatList({
            id:userInfo.id,
            firstName: userInfo.first_name,
            lastName: userInfo.last_name,
            avatar: userInfo.image_url,
            lastMessage: message.contentBody,
            conversationId: message.conversationId,
            lastTimestamp: message.timestamp,
            customerProfile: userInfo.customerProfile
          })
          addMessage(message).then()
        }).catch(err=>{
            console.log(err)
          })
      }
      //存在，只需更新对应列表项的部分数据
      else{
        updateChatList(message)
        addMessage(message).then()
      }
      socket.emit('message_delivered',{
        type: 'ACK',
        senderType: 'AGENT',
        recipientId: message.senderId,
        msgId: message.msgId,
        msgStatus: messageStore.activeCustomerItem === message.conversationId ? 'READ' : 'DELIVERED'
      })
    }
  }, [message]);

  // 处理离线消息
  useEffect(() => {
    if(offlineMessages){
      const messageStore = useMessageStore.getState();
      const {updateChatList,addMessage} = messageStore;
      // 客服端只处理客户发送的离线消息
      const customerMessages = offlineMessages.messages.filter((msg:MessageDataType) => msg.senderType === 'CUSTOMER')

      // 更新客户消息到聊天列表
      if(customerMessages.length > 0){
        updateChatList(customerMessages, false)
      }

      // 添加所有消息到消息列表
      addMessage(offlineMessages.messages).then()

      const msgIds = offlineMessages.messages.map((msg:MessageDataType)=>msg.msgId)
      socket.emit('offline_message_ack', {
        msgIds: Array.from(new Set(msgIds))
      });
    }
  }, [offlineMessages]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={en}>
        <s-app-nav>
          <s-link href="/app">{t.chat}</s-link>
          <s-link href="/app/orders">{t.orders}</s-link>
          <s-link href="/app/settings">{t.settings}</s-link>
        </s-app-nav>
        <ZoraModalProvider>
          <ZoraNotificationProvider>
            <AppContent notification={notification} orderFulfillment={orderFulfillment}/>
          </ZoraNotificationProvider>
        </ZoraModalProvider>
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default App
