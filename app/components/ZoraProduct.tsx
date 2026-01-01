import {useEffect, useState} from "react";
import {useMessageStore} from "@/zustand/zustand.ts";
import ZoraProductRecStyle from '@styles/componentStyles/ZoraProduct.module.scss'
import {useZoraUniversalModal} from "@/contexts/ZoraModalProvider.tsx";
import {GraphqlProductInfoType} from "@/type.ts";

export default function ZoraProduct (){
  const [isLoading,setLoading] = useState(true)
  const {shopify_Shop_products} = useMessageStore();
  const {showModal,hideModal} = useZoraUniversalModal()
  const [products,setProducts] = useState([]);
  const [pageInfo,setPageInfo] = useState({});
  useEffect(() => {
    setProducts(shopify_Shop_products?.products.nodes)
    setPageInfo(shopify_Shop_products?.products.pageInfo)
  }, []);

  const productCardClick = (e,item)=>{
    e.stopPropagation()
    const modalId = showModal({
      type: 'confirmation',
      title: '推荐产品',
      confirmationText: '是否将该产品推荐给客户',
      confirmButtonText: '推荐',
      cancelButtonText:'不推荐',
      onConfirm:()=>{
        console.log(item)
        hideModal(modalId)
      },
      onClose:()=>{
        console.log('您已取消推荐产品操作')
      }
    })

  }

  return <div className={ZoraProductRecStyle.productContainer}>
    {
      products.map((item:GraphqlProductInfoType["products"]["nodes"][0]) => {
        return <div className={ZoraProductRecStyle.productCard} key={item.id} onClick={(event)=> productCardClick(event,item)}>
          <div className={ZoraProductRecStyle.productCardImageWrapper}>
            <img className={ZoraProductRecStyle.productCardImage} src={item.featuredMedia.preview.image.url}
                 alt={item.title}/>
          </div>
          <div className={ZoraProductRecStyle.productCardInfo}>
            <h5 className={ZoraProductRecStyle.productCardTitle} title={item.title}>{item.title}</h5>
            <p className={ZoraProductRecStyle.productCardDesc} title={item.description}>{item.description}</p>
            <div className={ZoraProductRecStyle.productCardTagBox}>
              {
                item.tags.map((tag:string,index:number) => {
                  return <span className={ZoraProductRecStyle.productCardTag} key={index}>{tag}</span>
                })
              }
            </div>
            <span className={ZoraProductRecStyle.productCardVendor + ' ' + ZoraProductRecStyle.shimmerVendor}>{item.vendor}</span>
            <div className={ZoraProductRecStyle.productCardPrice}>
              <span className={ZoraProductRecStyle.productCardPriceCompare}>{
                 item.compareAtPriceRange.maxVariantCompareAtPrice.currencyCode + ' ' + item.compareAtPriceRange.maxVariantCompareAtPrice.amount
              }</span>
              <span className={ZoraProductRecStyle.productCardPriceCurrent}>{
                item.compareAtPriceRange.maxVariantCompareAtPrice.currencyCode + ' ' + item.variants.nodes[0].price
              }</span>
            </div>
          </div>
        </div>
      })
    }
  </div>
}
