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

    it('should handle malformed JSON body', () => {
      const mockReq = {
        body: 'invalid json',
        headers: {
          'x-shopify-shop-domain': 'test-shop.myshopify.com'
        }
      };

      expect(() => getWebhookParams(mockReq as any)).toThrow();
    });

    it('should handle missing body gracefully', () => {
      const mockReq = {
        body: null,
        headers: {
          'x-shopify-shop-domain': 'test-shop.myshopify.com'
        }
      };

      const params = getWebhookParams(mockReq as any);

      expect(params.id).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid GID format', () => {
      const invalidGid = 'not-a-valid-gid';
      const result = executeShopifyId(invalidGid);

      expect(result).toBe(invalidGid);
    });

    it('should handle null GID input', () => {
      const result = executeShopifyId(null as any);

      expect(result).toBeNull();
    });

    it('should handle undefined GID input', () => {
      const result = executeShopifyId(undefined as any);

      expect(result).toBeUndefined();
    });

    it('should handle empty string GID input', () => {
      const result = executeShopifyId('');

      expect(result).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numeric IDs', () => {
      const largeGid = 'gid://shopify/Customer/999999999999999';
      const result = executeShopifyId(largeGid);

      expect(result).toBe('999999999999999');
    });

    it('should handle special characters in ID', () => {
      const specialGid = 'gid://shopify/Customer/123-456_789';
      const result = executeShopifyId(specialGid);

      expect(result).toBe('123-456_789');
    });

    it('should handle multiple slashes in path', () => {
      const multiSlashGid = 'gid://shopify/Customer/123/456/789';
      const result = executeShopifyId(multiSlashGid);

      expect(result).toBe('123/456/789');
    });
  });

  describe('Webhook Parameter Extraction', () => {
    it('should extract multiple webhook parameters', () => {
      const mockReq = {
        body: JSON.stringify({
          admin_graphql_api_id: 'gid://shopify/Customer/123456',
          admin_graphql_api_user_id: 'gid://shopify/Customer/789012',
          id: '123456'
        }),
        headers: {
          'x-shopify-shop-domain': 'test-shop.myshopify.com',
          'x-shopify-topic': 'customers/update'
        }
      };

      const params = getWebhookParams(mockReq as any);

      expect(params.id).toBe('gid://shopify/Customer/123456');
      expect(params.shop).toBe('test-shop.myshopify.com');
    });

    it('should handle different shop domain formats', () => {
      const domains = [
        'test-shop.myshopify.com',
        'test-shop.myshopify.io',
        'test-shop.myshopify.cn'
      ];

      domains.forEach(domain => {
        const mockReq = {
          body: JSON.stringify({
            admin_graphql_api_id: 'gid://shopify/Customer/123456'
          }),
          headers: {
            'x-shopify-shop-domain': domain
          }
        };

        const params = getWebhookParams(mockReq as any);
        expect(params.shop).toBe(domain);
      });
    });

    it('should handle webhook topic extraction', () => {
      const topics = [
        'customers/create',
        'customers/update',
        'orders/create',
        'orders/updated',
        'products/create',
        'products/update'
      ];

      topics.forEach(topic => {
        const mockReq = {
          body: JSON.stringify({
            admin_graphql_api_id: 'gid://shopify/Customer/123456'
          }),
          headers: {
            'x-shopify-shop-domain': 'test-shop.myshopify.com',
            'x-shopify-topic': topic
          }
        };

        const params = getWebhookParams(mockReq as any);
        expect(params.shop).toBe('test-shop.myshopify.com');
      });
    });
  });
});
