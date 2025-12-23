import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "@/shopify.server.ts";

import '@styles/_variables.scss'

import {useEffect} from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  //设置主题
  const setTheme = ()=>{
    const theme = localStorage.getItem('YCChat_application_theme') || 'light'
    document.getElementsByTagName('html')[0].setAttribute('data-theme',theme)
  }

  useEffect(() => {
    setTheme()
  },[])

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Chat</s-link>
        <s-link href="/app/additional">Additional page</s-link>
        <s-link href="/app/properties">Properties</s-link>
        <s-link href="/app/calendar">Calendar</s-link>
        <s-link href="/app/offer">Offer</s-link>
        <s-link href="/app/documents">Documents</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <Outlet/>
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
