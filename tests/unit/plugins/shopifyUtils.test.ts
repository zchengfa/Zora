import { executeShopifyId, getWebhookParams } from '../../../plugins/shopifyUtils';

describe('Shopify Utils Tests', () => {
  describe('executeShopifyId', () => {
    it('should extract numeric ID from Shopify GID', () => {
      const shopifyGid = 'gid://shopify/Customer/123456789';
      const extractedId = executeShopifyId(shopifyGid);

      expect(extractedId).toBe('123456789');
    });

    it('should handle different entity types', () => {
      const customerGid = 'gid://shopify/Customer/123456';
      const orderGid = 'gid://shopify/Order/789012';
      const productGid = 'gid://shopify/Product/345678';

      expect(executeShopifyId(customerGid)).toBe('123456');
      expect(executeShopifyId(orderGid)).toBe('789012');
      expect(executeShopifyId(productGid)).toBe('345678');
    });

    it('should handle IDs with additional path segments', () => {
      const complexGid = 'gid://shopify/Customer/123456/extra/path';
      const extractedId = executeShopifyId(complexGid);

      expect(extractedId).toBe('123456/extra/path');
    });
  });

  describe('getWebhookParams', () => {
    it('should extract webhook parameters from request', () => {
      const mockReq = {
        body: JSON.stringify({
          admin_graphql_api_id: 'gid://shopify/Customer/123456'
        }),
        headers: {
          'x-shopify-shop-domain': 'test-shop.myshopify.com'
        }
      };

      const params = getWebhookParams(mockReq as any);

      expect(params.id).toBe('gid://shopify/Customer/123456');
      expect(params.shop).toBe('test-shop.myshopify.com');
    });

    it('should handle missing headers gracefully', () => {
      const mockReq = {
        body: JSON.stringify({
          admin_graphql_api_id: 'gid://shopify/Customer/123456'
        }),
        headers: {}
      };

      const params = getWebhookParams(mockReq as any);

      expect(params.id).toBeDefined();
      expect(params.shop).toBeUndefined();
    });
  });
});
