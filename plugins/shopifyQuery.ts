import {boolean} from "fast-check";

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

