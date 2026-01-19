import { createToken, verifyTokenAsync } from '../../../plugins/token';

describe('Token Plugin Tests', () => {
  const testSecret = 'test_secret_key_for_jwt';
  const testPayload = {
    session_id: 'test_session_123',
    userId: 'user_456'
  };

  beforeEach(() => {
    // 设置测试环境变量
    process.env.JWT_SECRET = testSecret;
  });

  describe('createToken', () => {
    it('should create a valid token', () => {
      const token = createToken(testPayload, '1d');

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should create token with default expiration', () => {
      const token = createToken(testPayload,'1d');
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should create token with custom expiration', () => {
      const token = createToken(testPayload, '7d');
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyTokenAsync', () => {
    it('should verify a valid token', async () => {
      const token = createToken(testPayload, '1d');
      const decoded = await verifyTokenAsync(token);

      expect(decoded).toBeDefined();
      expect(decoded.session_id).toBe(testPayload.session_id);
    });

    it('should reject an invalid token', async () => {
      const invalidToken = 'invalid.token.string';

      await expect(verifyTokenAsync(invalidToken)).rejects.toThrow();
    });

    it('should reject an expired token', async () => {
      // 创建一个已过期的token
      const token = createToken(testPayload, '-1d'); // 负数表示已过期

      await expect(verifyTokenAsync(token)).rejects.toThrow();
    });
  });
});
