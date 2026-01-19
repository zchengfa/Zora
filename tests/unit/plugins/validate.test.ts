import { RegexEmail, verifyShopifyHmac, validateShopifyHmacRequest, hashCode, validateHashCode, validateShopifySecretRequest, validateShopifyRequest, validateWebhookHmac } from '../../../plugins/validate';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';

describe('Validate Plugin Tests', () => {
  describe('RegexEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'test123@example.org',
        'a@b.co',
        'user.name+tag+123@example-domain.co.uk'
      ];

      validEmails.forEach(email => {
        expect(RegexEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'test@',
        'test@example',
        'test..email@example.com',
        'test@.com',
        'test@com',
        'test@example..com',
        'test@.example.com',
        'test@example.c',
        'test@example..com',
        'test@exa..mple.com'
      ];

      invalidEmails.forEach(email => {
        expect(RegexEmail(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      // 测试连续的点
      expect(RegexEmail('test..email@example.com')).toBe(false);
      expect(RegexEmail('test.email..name@example.com')).toBe(false);
      expect(RegexEmail('test@email..example.com')).toBe(false);
      
      // 测试单字符顶级域名
      expect(RegexEmail('test@example.c')).toBe(false);
      
      // 测试特殊字符
      expect(RegexEmail('test%email@example.com')).toBe(true);
      expect(RegexEmail('test+email@example.com')).toBe(true);
      expect(RegexEmail('test-email@example.com')).toBe(true);
      expect(RegexEmail('test_email@example.com')).toBe(true);
    });
  });

  describe('verifyShopifyHmac', () => {
    const testSecret = 'test_secret_key_123';
    const testParams = {
      shop: 'test-shop.myshopify.com',
      hmac: 'test_hmac_value',
      locale: 'en',
      embedded: '1',
      session: 'test_session',
      host: 'test_host',
      id_token: 'test_id_token',
      timestamp: '1234567890'
    };

    it('should verify valid HMAC', () => {
      // 生成真实的HMAC值进行测试
      const { hmac, ...rest } = testParams;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      const paramsWithValidHmac = { ...testParams, hmac: validHmac };
      expect(verifyShopifyHmac(paramsWithValidHmac, testSecret)).toBe(true);
    });

    it('should return false for missing HMAC', () => {
      const paramsWithoutHmac = { ...testParams, hmac: '' };
      expect(verifyShopifyHmac(paramsWithoutHmac, testSecret)).toBe(false);
    });

    it('should return false for invalid HMAC', () => {
      expect(verifyShopifyHmac(testParams, testSecret)).toBe(false);
    });

    it('should return false for HMAC with different length', () => {
      const { hmac, ...rest } = testParams;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      // 使用截断的HMAC值
      const truncatedHmac = validHmac.substring(0, validHmac.length - 10);
      const paramsWithTruncatedHmac = { ...testParams, hmac: truncatedHmac };
      expect(verifyShopifyHmac(paramsWithTruncatedHmac, testSecret)).toBe(false);
    });
  });

  describe('validateShopifyHmacRequest', () => {
    const testSecret = 'test_secret_key_123';
    const mockQuery = {
      shop: 'test-shop.myshopify.com',
      hmac: 'test_hmac',
      id_token: 'test_token',
      timestamp: Math.floor(Date.now() / 1000).toString(),
      locale: 'en',
      embedded: '1',
      session: 'test_session',
      host: 'test_host'
    };

    beforeEach(() => {
      // Mock environment variable
      process.env.SHOPIFY_API_SECRET = testSecret;
    });

    it('should validate complete request', () => {
      // 生成有效的HMAC值
      const { hmac, ...rest } = mockQuery;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      const queryWithValidHmac = { ...mockQuery, hmac: validHmac };
      const result = validateShopifyHmacRequest(queryWithValidHmac);
      expect(result.result).toBe(true);
      expect(result.message).toBe('valid Shopify request');
    });

    it('should reject request with missing parameters', () => {
      const incompleteQuery = { shop: 'test-shop.myshopify.com' };
      const result = validateShopifyHmacRequest(incompleteQuery);
      expect(result.result).toBe(false);
      expect(result.message).toContain('Missing required parameters');
    });

    it('should reject request with invalid HMAC', () => {
      const result = validateShopifyHmacRequest(mockQuery);
      expect(result.result).toBe(false);
      expect(result.message).toContain('Invalid HMAC signature');
    });

    it('should reject request with invalid shop domain', () => {
      const { hmac, ...rest } = mockQuery;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      const queryWithInvalidShop = { ...mockQuery, hmac: validHmac, shop: 'invalid-shop.com' };
      const result = validateShopifyHmacRequest(queryWithInvalidShop);
      expect(result.result).toBe(false);
      expect(result.message).toContain('Invalid shop domain');
    });

    it('should validate request with timestamp when enabled', () => {
      const { hmac, ...rest } = mockQuery;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      const queryWithValidHmac = { ...mockQuery, hmac: validHmac };
      const result = validateShopifyHmacRequest(queryWithValidHmac, true);
      expect(result.result).toBe(true);
    });

    it('should reject request with old timestamp when validation enabled', () => {
      const { hmac, ...rest } = mockQuery;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      // 使用10分钟前的时间戳
      const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
      const queryWithOldTimestamp = { ...mockQuery, hmac: validHmac, timestamp: oldTimestamp };
      const result = validateShopifyHmacRequest(queryWithOldTimestamp, true);
      expect(result.result).toBe(false);
      expect(result.message).toContain('Invalid timestamp');
    });
  });

  describe('hashCode', () => {
    it('should generate consistent hash for same input', () => {
      const code = 'test_code_123';
      const hash1 = hashCode(code);
      const hash2 = hashCode(code);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashCode('code1');
      const hash2 = hashCode('code2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateHashCode', () => {
    it('should validate matching hash codes', () => {
      const code = 'test_code';
      const hash = hashCode(code);

      expect(validateHashCode(code, hash)).toBe(true);
    });

    it('should reject non-matching hash codes', () => {
      const code = 'test_code';
      const wrongHash = hashCode('wrong_code');

      expect(validateHashCode(code, wrongHash)).toBe(false);
    });
  });

  describe('validateShopifySecretRequest', () => {
    const testSecret = 'test_secret_key_123';

    it('should validate matching secrets', () => {
      const result = validateShopifySecretRequest(testSecret, testSecret);
      expect(result.result).toBe(true);
      expect(result.message).toBe('Secret validation successful');
    });

    it('should reject non-matching secrets', () => {
      const result = validateShopifySecretRequest('wrong_secret', testSecret);
      expect(result.result).toBe(false);
      expect(result.message).toBe('Secret validation failed');
    });

    it('should reject missing secret', () => {
      const result = validateShopifySecretRequest('', testSecret);
      expect(result.result).toBe(false);
      expect(result.message).toBe('Missing request secret');
    });
  });

  describe('validateShopifyRequest', () => {
    const testSecret = 'test_secret_key_123';
    const mockQuery = {
      shop: 'test-shop.myshopify.com',
      hmac: 'test_hmac',
      id_token: 'test_token',
      timestamp: Math.floor(Date.now() / 1000).toString(),
      locale: 'en',
      embedded: '1',
      session: 'test_session',
      host: 'test_host'
    };

    beforeEach(() => {
      process.env.SHOPIFY_API_SECRET = testSecret;
    });

    it('should validate request with HMAC', () => {
      const { hmac, ...rest } = mockQuery;
      const message = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('&');
      
      const validHmac = createHmac('sha256', testSecret)
        .update(message, 'utf8')
        .digest('hex');
      
      const queryWithValidHmac = { ...mockQuery, hmac: validHmac };
      const result = validateShopifyRequest(queryWithValidHmac);
      expect(result.result).toBe(true);
    });

    it('should validate request with request_secret', () => {
      const params = { request_secret: testSecret };
      const result = validateShopifyRequest(params);
      expect(result.result).toBe(true);
    });

    it('should reject request with invalid request_secret', () => {
      const params = { request_secret: 'wrong_secret' };
      const result = validateShopifyRequest(params);
      expect(result.result).toBe(false);
    });

    it('should reject request with no authentication method', () => {
      const params = { shop: 'test-shop.myshopify.com' };
      const result = validateShopifyRequest(params);
      expect(result.result).toBe(false);
      expect(result.message).toBe('No valid authentication method provided');
    });
  });

  describe('validateWebhookHmac', () => {
    const testSecret = 'test_secret_key_123';
    const testBody = JSON.stringify({ test: 'data' });

    beforeEach(() => {
      process.env.SHOPIFY_API_SECRET = testSecret;
    });

    it('should validate valid webhook HMAC', () => {
      const validHmac = createHmac('sha256', testSecret)
        .update(testBody, 'utf-8')
        .digest('base64');
      
      const mockReq = {
        headers: {
          'x-shopify-hmac-sha256': validHmac
        },
        body: testBody
      } as Request;
      
      expect(validateWebhookHmac(mockReq)).toBe(true);
    });

    it('should reject invalid webhook HMAC', () => {
      const mockReq = {
        headers: {
          'x-shopify-hmac-sha256': 'invalid_hmac'
        },
        body: testBody
      } as Request;
      
      expect(validateWebhookHmac(mockReq)).toBe(false);
    });

    it('should handle missing HMAC header', () => {
      const mockReq = {
        headers: {},
        body: testBody
      } as Request;
      
      expect(validateWebhookHmac(mockReq)).toBe(false);
    });

    it('should handle different body content', () => {
      const validHmac = createHmac('sha256', testSecret)
        .update(testBody, 'utf-8')
        .digest('base64');
      
      const mockReq = {
        headers: {
          'x-shopify-hmac-sha256': validHmac
        },
        body: JSON.stringify({ different: 'data' })
      } as Request;
      
      expect(validateWebhookHmac(mockReq)).toBe(false);
    });
  });
});
