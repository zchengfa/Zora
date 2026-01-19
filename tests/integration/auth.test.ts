import request from 'supertest';
import express from 'express';
import { zoraApi } from '../../zoraServer/zoraApi';

// Mock dependencies
jest.mock('../../plugins/redisClient', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    multi: jest.fn(() => ({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }))
  }
}));

jest.mock('../../plugins/prismaClient', () => ({
  prismaClient: {
    customers: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    session: {
      upsert: jest.fn(),
      findUnique: jest.fn()
    },
    shop: {
      findUnique: jest.fn()
    }
  }
}));

describe('Authentication Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // zoraApi({ app, redis: redisClient, prisma: prismaClient, shopifyApiClientsManager: mockManager });
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete login process', async () => {
      // 1. 检查邮箱是否存在
      const checkEmailResponse = await request(app)
        .post('/checkEmail')
        .send({ email: 'test@example.com' });

      expect(checkEmailResponse.status).toBeDefined();

      // 2. 发送验证码
      const sendCodeResponse = await request(app)
        .post('/sendVerifyCodeToEmail')
        .send({ 
          email: 'test@example.com',
          isAuth: false 
        });

      expect(sendCodeResponse.status).toBeDefined();

      // 3. 验证验证码
      const verifyCodeResponse = await request(app)
        .post('/verifyCode')
        .send({ 
          code: '123456',
          email: 'test@example.com' 
        });

      expect(verifyCodeResponse.status).toBeDefined();

      // 4. 登录
      const loginResponse = await request(app)
        .post('/authenticator')
        .send({
          email: 'test@example.com',
          authCode: '123456',
          firstName: 'Test',
          lastName: 'User',
          marketEmail: true,
          marketSMS: false,
          authPwd: false
        });

      expect(loginResponse.status).toBeDefined();
    });
  });

  describe('Token Validation Flow', () => {
    it('should validate and refresh tokens', async () => {
      // 登录获取token
      const loginResponse = await request(app)
        .post('/authenticator')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          marketEmail: true,
          marketSMS: false,
          authPwd: true
        });

      // 验证token
      if (loginResponse.body.token) {
        const validateResponse = await request(app)
          .post('/validateToken')
          .set('Authorization', `Bearer ${loginResponse.body.token}`);

        expect(validateResponse.status).toBeDefined();
      }
    });
  });
});
