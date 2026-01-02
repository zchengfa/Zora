import ZoraProductCardStyle from "@styles/componentStyles/ZoraProductCard.module.scss";
import React from 'react'
import type {ZoraProductType} from "@/type.ts";


interface ZoraProductCardProps {
  product: ZoraProductType,
  productClick?: (event: React.MouseEvent<HTMLDivElement>, product: ZoraProductType)=> void,
  width?: string,
  display?: 'column' | 'row' | 'row-reverse' | 'column-reverse',
}

const ZoraProductCard:React.FC<ZoraProductCardProps> = (
  {
    product,
    productClick,
    width = '100%',
    display = 'column',
  }
)=>{

  const productCardClick = (event: React.MouseEvent<HTMLDivElement>, product: ZoraProductType)=>{
    productClick?.(event,product)
  }

  return <div className={ZoraProductCardStyle.productCard} style={{'--product-card-width': width,'--product-card-display': display} as React.CSSProperties} onClick={(event)=> productCardClick(event,product)}>
    <div className={display === 'column' ? `${ZoraProductCardStyle.productCardImageWrapper}` : `${ZoraProductCardStyle.productCardImageWrapper}  ${ZoraProductCardStyle.productCardImageWrapperRow}`}>
      <img className={ZoraProductCardStyle.productCardImage} src={product.featuredMedia.preview.image.url}
           alt={product.title}/>
    </div>
    <div className={display === 'column' ? `${ZoraProductCardStyle.productCardInfo}` : `${ZoraProductCardStyle.productCardInfo} ${ZoraProductCardStyle.productCardInfoRow}`}>
      <h5 className={ZoraProductCardStyle.productCardTitle} title={product.title}>{product.title}</h5>
      <p className={ZoraProductCardStyle.productCardDesc} title={product.description}>{product.description}</p>
      <div className={ZoraProductCardStyle.productCardTagBox}>
        {
          product.tags.map((tag:string,index:number) => {
            return <span className={ZoraProductCardStyle.productCardTag} key={index}>{tag}</span>
          })
        }
      </div>
      <span className={ZoraProductCardStyle.productCardVendor + ' ' + ZoraProductCardStyle.shimmerVendor}>{product.vendor}</span>
      {
        product.variants?.nodes ? <div className={ZoraProductCardStyle.productCardPrice}>
              <span className={ZoraProductCardStyle.productCardPriceCompare}>{
                product.compareAtPriceRange.maxVariantCompareAtPrice.currencyCode + ' ' + product.compareAtPriceRange.maxVariantCompareAtPrice.amount
              }</span>
          <span className={ZoraProductCardStyle.productCardPriceCurrent}>{
            product.compareAtPriceRange.maxVariantCompareAtPrice.currencyCode + ' ' + product.variants.nodes[0].price
          }</span>
        </div> : null
      }
    </div>
  </div>
}

export default ZoraProductCard
