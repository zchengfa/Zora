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
  input?:CustomerCreateInput
}

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
