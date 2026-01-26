import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "@/shopify.server.ts";
import ZoraModalProvider from "@/contexts/ZoraModalProvider.tsx";
import ZoraNotificationProvider from "@/contexts/ZoraNotificationProvider.tsx";

import  '@styles/_variables.scss'
import  '@styles/base.scss'

import {useEffect} from "react";
import {useSocketService} from "@hooks/useSocketService.ts";
import {useMessageStore} from "@/zustand/zustand.ts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const { socket } = useSocketService()

  const {customerStaff, chatList, activeCustomerItem} = useMessageStore()

  useEffect(() => {
    //设置主题
    const setTheme = ()=>{
      const theme = localStorage.getItem('zora_application_theme') || 'light'
      document.getElementsByTagName('html')[0].setAttribute('data-theme',theme)
    }
    setTheme()

  },[])

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

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Chat</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <ZoraModalProvider>
        <ZoraNotificationProvider>
          <Outlet/>
        </ZoraNotificationProvider>
      </ZoraModalProvider>
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
