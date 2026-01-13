
export interface GraphqlShopResponse {
  shop:{
    email:string,
    shopOwnerName:string,
  }
}

export interface GraphqlCustomerCountResponse {
  customersCount:{
    count:number
  }
}
export interface GraphqlOrdersCountResponse {
  ordersCount:{
    count:number,
    precision: 'EXACT' | 'AT_LEAST'
  }
}

export interface GraphqlCustomerResponse {
  customers:{
    nodes:Array<{
      id: string,
      firstName: string | null,
      lastName: string | null,
      defaultEmailAddress:{
        emailAddress:string,
        marketingState:string
      },
      defaultPhoneNumber :{
        phoneNumber:number,
        marketingState: string
        marketingCollectedFrom:string
      } | null,
      createdAt:string,
      updatedAt:string,
      numberOfOrders:string,
      state:string,
      amountSpent: {
        amount:string,
        currencyCode:string
      }
      verifiedEmail:boolean,
      taxExempt:boolean,
      tags:Array<string>,
      addresses: Array<{
        id:string,
        firstName:string,
        lastName:string,
        address1:string,
        city:string,
        province:string,
        country:string,
        zip:string,
        phone: string,
        name:string,
        provinceCode:string
        countryCodeV2:string
      }> | null,
      defaultAddress: {
        id:string,
        address1:string,
        city:string,
        province:string,
        country:string,
        zip:string,
        phone:string | null,
        provinceCode:string
        countryCodeV2:string
      }
    }>,
    pageInfo:{
      hasNextPage:boolean,
      hasPreviousPage:boolean,
      startCursor:string,
      endCursor:string
    }
  }
}

// 基础标量类型对应的 TypeScript 类型
interface ShopMoney {
  amount: string;
  currencyCode: string;
}

interface PresentmentMoney {
  amount: string;
  currencyCode: string;
}

interface MoneySet {
  shopMoney: ShopMoney;
  presentmentMoney: PresentmentMoney;
}

// 商品变体信息
interface Variant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
}

// 订单行项目
interface LineItem {
  title: string;
  quantity: number;
  sku:string;
  variantTitle:string;
  originalUnitPriceSet: MoneySet
  discountedUnitPriceSet: MoneySet
}

// 税费信息
interface TaxLine {
  title: string;
  priceSet: MoneySet;
  ratePercentage: number;
  rate: number;
  source: string | null;
}

// 客户信息
interface Customer {
  id: string;
  displayName: string;
  defaultEmailAddress: {
    emailAddress: string;
  };
}

// 渠道信息
interface ChannelInformation {
  displayName: string;
}

// 配送地址
interface ShippingAddress {
  name: string | null;
  address1: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
}

// 显示地址（格式化）
interface DisplayAddress {
  formattedArea: string;
}

// 主订单接口
 interface Order {
  id: string;
  name: string;
  note: string | null;
  phone: string | null;
  processedAt: string;
  returnStatus: string;
  statusPageUrl: string;

  lineItems: {
    nodes: LineItem[];
  };

  channelInformation: ChannelInformation;
  confirmationNumber: string;
  currencyCode: string;
  currentSubtotalLineItemsQuantity: number;
  currentSubtotalPriceSet: MoneySet;
  currentTotalAdditionalFeesSet: MoneySet | null;
  currentTotalDiscountsSet: MoneySet;
  currentTotalWeight: string;
  additionalFees:Array<{
    id: string;
    name: string;
    price: MoneySet
  }>;
  currentTaxLines: TaxLine[];
  createdAt: string;
  updatedAt: string;
  customer: Customer | null;
  subtotalPriceSet: MoneySet;
  displayAddress: DisplayAddress | null;
  fullyPaid: boolean;
  unpaid: boolean;
  totalShippingPriceSet: MoneySet;
  totalPriceSet: MoneySet;
  totalReceivedSet: MoneySet;
  shippingAddress: ShippingAddress | null;
  totalTaxSet: MoneySet;
}

// 分页信息
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

// 完整的查询响应类型
export interface GraphqlOrdersResponse {
  orders: {
    nodes: Order[];
    pageInfo: PageInfo;
  };
}

// 查询变量类型
export interface GraphqlQueryVariables {
  limit?: number;
  afterCursor?: string | null;
  orderId?:string
}

type MoneyDetailSet = {
  amount: string;
  currencyCode: string;
}

export interface GraphqlProductsResponse {
  products:{
    nodes: Array<{
      id: string;
      title: string;
      description: string;
      descriptionHtml: string;
      tags: Array<string>;
      vendor: string;
      variants: {
        nodes: Array<{
          id:string,
          price:string,
          unitPrice:MoneyDetailSet,
          sku: string,
          position: number
        }>
      };
      priceRangeV2:{
        maxVariantPrice:MoneyDetailSet,
        minVariantPrice:MoneyDetailSet,
      }
      compareAtPriceRange:{
        maxVariantCompareAtPrice:MoneyDetailSet,
        minVariantCompareAtPrice:MoneyDetailSet
      }
      featuredMedia:{
        id: string;
        mediaContentType: string,
        preview:{
          image:{
            url:string,
            thumbhash: string

          }
        }
      }
      variantsCount:{
        count: number
      }
      media: {
        nodes: Array<{
          id: string,
          mediaContentType: string,
          preview: {
            image: {
              url: string,
              thumbhash: string
            }
          }
        }>
      }
      mediaCount:{
        count:number
      }
      createdAt: string,
      updatedAt: string
    }>;
    pageInfo: PageInfo;
  }
}

export interface GraphqlProductsCountResponse {
  productsCount:{
    count:number
  }
}

export interface GraphqlOrderResponse {
  order: GraphqlOrdersResponse['orders']["nodes"][0]
}

export const CUSTOMERS_QUERY = `
  query customersList($limit: Int,$afterCursor:String) {
    customers(first: $limit,after: $afterCursor) {
      nodes {
        id
        firstName
        lastName
        defaultEmailAddress {
          emailAddress
          marketingState
        }
        defaultPhoneNumber {
          phoneNumber
          marketingState
          marketingCollectedFrom
        }
        createdAt
        updatedAt
        numberOfOrders
        state
        amountSpent {
          amount
          currencyCode
        }
        verifiedEmail
        taxExempt
        tags
        addresses {
          id
          firstName
          lastName
          address1
          city
          province
          country
          zip
          phone
          name
          provinceCode
          countryCodeV2
        }
        defaultAddress {
          id
          address1
          city
          province
          country
          zip
          phone
          provinceCode
          countryCodeV2
        }
      }
      pageInfo{
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`

export const CUSTOMER_COUNT_QUERY = `
  query customerCountQuery {
    customersCount{
      count
    }
  }
`

export const ORDERS_COUNT_QUERY = `
  query ordersCountQuery {
    ordersCount(limit:2000) {
       count
       precision
    }
  }
 `

export const SHOP_OWNER_NAME_QUERY = `
  query shopOwnerNameQuery {
    shop {
      email
      shopOwnerName
    }
  }
`

export const ORDERS_QUERY = `
  query orders($limit:Int,$afterCursor:String){
  orders(first:$limit,after:$afterCursor){
    nodes{
      id
      name
      note
      phone
      processedAt
      returnStatus
      statusPageUrl(audience:MERCHANTVIEW)
      createdAt
      updatedAt
      additionalFees{
        id
        name
        price{
          shopMoney{
            amount
            currencyCode
          }
        }
      }
      lineItems(first: 10) {
        nodes {
          title
          quantity
          discountedUnitPriceSet{
            shopMoney{
              amount
              currencyCode
            }
          }
          sku
          variantTitle
          originalUnitPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
      channelInformation{
        displayName
      }
      confirmationNumber
      currencyCode
      currentSubtotalLineItemsQuantity
      currentSubtotalPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      currentTotalAdditionalFeesSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      currentTotalDiscountsSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      currentTotalWeight
      currentTaxLines{
        title
        priceSet{
          shopMoney{
            amount
            currencyCode
          }
          presentmentMoney{
            amount
            currencyCode
          }
        }
        ratePercentage
        rate
        source
      }
      customer{
        id
        displayName
        defaultEmailAddress{
          emailAddress
        }
      }
      subtotalPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      displayAddress{
        formattedArea
      }
      fullyPaid
      unpaid
      totalShippingPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      totalPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      totalTaxSet{
        shopMoney{
          amount
          currencyCode
        }
      }
      totalReceivedSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      shippingAddress {
        name
        address1
        city
        province
        country
        zip
      }
    }
    pageInfo{
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
`

export const PRODUCTS_QUERY = `
query GetProducts ($limit: Int, $afterCursor: String){
    products(first: $limit,after:$afterCursor) {
      nodes {
        id
        title
        description
        descriptionHtml
        tags
        vendor
        variants(first:10){
          nodes{
            id
            price
            position
            unitPrice{
              amount
              currencyCode
            }
            sku
          }
        }
        priceRangeV2{
          maxVariantPrice{
            amount
            currencyCode
          }
          minVariantPrice{
            amount
            currencyCode
          }
        }
        compareAtPriceRange{
          maxVariantCompareAtPrice{
            currencyCode
            amount
          }
          minVariantCompareAtPrice{
            currencyCode
            amount
          }
        }
        featuredMedia{
          id
          mediaContentType
          preview{
            image{
              url
              thumbhash

            }
          }
        }

        variantsCount{
          count
        }
        media(first:10){
          nodes{
            id
            mediaContentType
            preview{
              image{
                url
                thumbhash
              }

            }

          }
        }
        mediaCount{
          count
        }
        createdAt
        updatedAt
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }`

export const PRODUCTS_COUNT_QUERY = `
  query GetProductsCount{
    productsCount{
      count
    }
  }
`

export const ORDER_QUERY = `
  query getOrder($orderId:ID!){
    order(id:$orderId){
      id
      name
      note
      phone
      processedAt
      returnStatus
      statusPageUrl(audience:MERCHANTVIEW)
      lineItems(first: 10) {
        nodes {
          title
          quantity
          sku
          variantTitle
          originalUnitPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          discountedUnitPriceSet{
            shopMoney{
              amount
              currencyCode
            }
          }
        }
      }
      channelInformation{
        displayName
      }
      confirmationNumber
      currencyCode
      currentSubtotalLineItemsQuantity
      currentSubtotalPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      currentTotalAdditionalFeesSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      currentTotalDiscountsSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      currentTotalWeight
      currentTaxLines{
        title
        priceSet{
          shopMoney{
            amount
            currencyCode
          }
          presentmentMoney{
            amount
            currencyCode
          }
        }
        ratePercentage
        rate
        source
      }
      customer{
        id
        displayName
        defaultEmailAddress{
          emailAddress
        }
      }
      subtotalPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      displayAddress{
        formattedArea
      }
      fullyPaid
      unpaid
      totalShippingPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      totalPriceSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      totalReceivedSet{
        shopMoney{
          amount
          currencyCode
        }
        presentmentMoney{
          amount
          currencyCode
        }
      }
      shippingAddress {
        name
        address1
        city
        province
        country
        zip
      }
      additionalFees{
        id
        name
        price{
          shopMoney{
            amount
            currencyCode
          }
        }
      }
      createdAt
      updatedAt
      totalTaxSet{
        shopMoney{
          amount
          currencyCode
        }
      }

      totalReceivedSet{
        shopMoney{
          amount
          currencyCode
        }
      }
    }
  }
`

