import React ,{useEffect, useState} from "react";
import {useMessageStore} from "@/zustand/zustand.ts";
import ZoraProductStyle from '@styles/componentStyles/ZoraProduct.module.scss'
import {useZoraUniversalModal} from "@/contexts/ZoraModalProvider.tsx";
import type {ZoraProductType} from "@/type.ts";
import ZoraProductCard from '@/components/common/ZoraProductCard.tsx'
import {useSocketService} from "@hooks/useSocketService.ts";
import {MessageDataType} from "@Utils/socket.ts";
import {MessageServiceSendMessage} from "@Utils/MessageService.ts";

export default function ZoraProduct (){
  const [isLoading,setLoading] = useState(true)
  const {shopify_Shop_products} = useMessageStore();
  const {showModal,hideModal} = useZoraUniversalModal()
  const [products,setProducts] = useState<ZoraProductType[]>([]);
  const [pageInfo,setPageInfo] = useState({});
  const {socket} = useSocketService()
  const messageStore = useMessageStore()
  useEffect(() => {
    setProducts(shopify_Shop_products?.products.nodes)
    setPageInfo(shopify_Shop_products?.products.pageInfo)
  }, []);

  const productCardClick = (e:React.MouseEvent<HTMLElement>,item:ZoraProductType)=>{
    e.stopPropagation()
    const modalId = showModal({
      type: 'confirmation',
      title: '推荐产品',
      confirmationText: '是否将该产品推荐给客户',
      confirmButtonText: '推荐',
      cancelButtonText:'不推荐',
      onConfirm:()=>{
        console.log(item)
        const msgData:MessageDataType = {
          senderId: messageStore.customerStaff?.id,
          senderType: 'AGENT',
          contentType: 'PRODUCT_CARD',
          msgStatus: '',
          recipientType: 'CUSTOMER',
          recipientId: messageStore.activeCustomerInfo.id,
          contentBody:JSON.stringify(item),
          msgId: 'msg_'+ new Date().getTime(),
          conversationId: messageStore.activeCustomerItem,
          timestamp: new Date().getTime().toString(),
        }
        MessageServiceSendMessage({
          message:msgData,
          messageStore,
          socket,
        })
        hideModal(modalId)
      },
      onClose:()=>{
        console.log('您已取消推荐产品操作')
      }
    })

  }

  return <div className={ZoraProductStyle.productContainer}>
    {
      products.map((item:ZoraProductType) => {
        return <ZoraProductCard product={item} width={'30%'} productClick={productCardClick} key={item.id}></ZoraProductCard>
      })
    }
  </div>
}
