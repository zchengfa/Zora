import type {LoaderFunctionArgs} from "react-router";
import {useLoaderData} from "react-router";
import {authenticate} from "../shopify.server";

import indexStyle from '../styles/pages/app_index.module.scss'
import ZoraSearch from '../components/ZoraSearch'

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
          </div>
          <div className={indexStyle.chatMiddle}></div>
          <div className={indexStyle.chatRight}></div>
        </div>
      </div>
    </div>
  </div>
}

