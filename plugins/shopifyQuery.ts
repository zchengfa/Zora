
export const CUSTOMER_QUERY = `
  query customersList($limit: Int) {
    customers(first: $limit) {
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

export const SHOP_OWNER_NAME_QUERY = `
  query shopOwnerNameQuery {
    shop {
      email
      shopOwnerName
    }
  }
`

