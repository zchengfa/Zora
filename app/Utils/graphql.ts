import gql from "graphql-tag";

export const SHOP_INFO_QUERY_GQL =
  `query shopOwnerName {
        shop {
          email
          shopOwnerName
        }
    }`

export const PRODUCTS_QUERY_GQL =
  `query productInfo($first: Int){
      products(first: $first) {
        nodes {
          id
          title
          description
          descriptionHtml
          tags
          vendor
          variants(first:10){
            nodes{
              price
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
            preview{
                image{
                  url
                }
            }
          }
          media(first:10){
            nodes{
              preview{
                image{
                  url
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }`
export const executeGelQuery = (query:string)=>{
  return  gql(query)
}
