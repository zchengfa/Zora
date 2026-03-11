import type {GraphqlCustomersResponse} from "./shopifyQuery.ts";

export interface GraphqlCustomerCreateMutationResponse {
  customerCreate:{
    userErrors:[] | Array<{
      filed:string,
      message:string
    }>,
    customer:GraphqlCustomersResponse['customers']['nodes'][0]
  }
}

export type MarketConsent = Partial<{
  consentUpdatedAt: string,
  marketingOptInLevel: 'CONFIRMED_OPT_IN' | 'UNKNOWN' | 'SINGLE_OPT_IN'
  marketingState: 'NOT_SUBSCRIBED' | 'PENDING' | 'REDACTED' | 'SUBSCRIBED' | 'UNSUBSCRIBED'
  sourceLocationId: string
}>

export interface CustomerCreateInput {
  email:string
  firstName:string
  lastName:string
  phone?: number,
  emailMarketingConsent:MarketConsent
  smsMarketingConsent?:MarketConsent
  tags?:string[] | string
}

export interface GraphqlMutationVariables {
  input?:CustomerCreateInput | FulfillmentInput | FulfillmentOrderMoveInput
}

//新建客户
export const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreateMutation($input:CustomerInput!){
    customerCreate(input:$input){
      userErrors{
        field
        message
      }
      customer{
          id
          firstName
          lastName
          displayName
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
    }
  }
`

export interface GraphqlFulfillmentCreateMutationResponse {
  fulfillmentCreate: {
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
    fulfillment: {
      id: string;
      status: string;
      trackingInfo: {
        company: string;
        number: string;
        url: string;
      }[];
    };
  };
}

export interface FulfillmentInput {
  trackingInfo: {
    number?: string;
    url?: string;
    company: string;
    numbers?: string[];
    urls?: string[];
  };
  notifyCustomer?: boolean;
  lineItemsByFulfillmentOrder: Array<{
    fulfillmentOrderId: string;
    fulfillmentOrderLineItems: Array<{
      id: string;
      quantity: number;
    }>;
  }>;
  originAddress?: {
    address1: string;
    address2?: string;
    city: string;
    zip?: number | string;
    provinceCode: string;
    countryCode: string;
  };
  message?: string;
}

//创建履约订单
export const FULFILLMENT_CREATE_MUTATION = `
  mutation fulfillmentCreate($input: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $input) {
      userErrors {
        field
        message
      }
      fulfillment {
        id
        status
        trackingInfo {
          company
          number
          url
        }
      }
    }
  }
`
type FulfillmentOrderLineItemInput = {
  id:string,
  quantity:number
}

export interface FulfillmentOrderMoveInput {
  fulfillmentOrderLineItems:FulfillmentOrderLineItemInput[],
  id:string,
  newLocationId:string
}

export interface GraphqlFulfillmentOrderMoveMutationResponse {
  fulfillmentOrderMove: {
    movedFulfillmentOrder: {
      id: string;
      status: string;
    };
    originalFulfillmentOrder: {
      id: string;
      status: string;
    };
    remainingFulfillmentOrder: {
      id: string;
      status: string;
    };
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}
//修改特定待履约订单的发货地点
export const FULFILLMENT_ORDER_UPDATE_LOCATION_MUTATION = `
  mutation fulfillmentOrderMove($input:FulfillmentOrderLineItemInput!,$id:ID!,$newLocationId:ID!){
    fulfillmentOrderMove(fulfillmentOrderLineItems:$input,id:$id,newLocationId:$newLocationId){
      movedFulfillmentOrder {
      id
      status
    }
    originalFulfillmentOrder {
      id
      status
    }
    remainingFulfillmentOrder {
      id
      status
    }
    userErrors {
      field
      message
    }
    }
  }
`
