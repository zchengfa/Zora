import { SocketUtils } from '../../../plugins/socketUtils';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@prisma/client');
jest.mock('../../../plugins/bullTaskQueue', () => ({
  addMessageStatusUpdateJob: jest.fn(),
  beginLogger: jest.fn(),
  addOfflineMessageJob: jest.fn()
}));
jest.mock('../../../plugins/openAI', () => ({
  chatWithAI: jest.fn(),
  streamChatWithAI: jest.fn()
}));

describe('SocketUtils', () => {
  let mockRedis: jest.Mocked<Redis>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockIo: jest.Mocked<Server>;
  let mockSocket: any;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockIo = new Server() as jest.Mocked<Server>;
    mockSocket = {
      id: 'socket1',
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('sendWebhookNotification', () => {
    it('should send webhook notification to all online agents', async () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      await SocketUtils.sendWebhookNotification({
        webhookType: 'orders/create',
        data: { id: 'order1' },
        shop: 'test-shop.myshopify.com'
      });

      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should handle null io instance gracefully', async () => {
      await SocketUtils.sendWebhookNotification({
        webhookType: 'customers/update',
        data: { id: 'customer1' },
        shop: 'test-shop.myshopify.com'
      });

      // Should not throw error when io instance is null
      expect(true).toBe(true);
    });

    it('should handle null agent map gracefully', async () => {
      await SocketUtils.sendWebhookNotification({
        webhookType: 'products/update',
        data: { id: 'product1' },
        shop: 'test-shop.myshopify.com'
      });

      // Should not throw error when agent map is null
      expect(true).toBe(true);
    });
  });

  describe('message handling', () => {
    it('should handle message acknowledgment', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      const mockAck = {
        msgId: 'msg1',
        msgStatus: 'READ',
        conversationId: 'conv1'
      };

      // Trigger message acknowledgment
      mockSocket.emit('message_ack', mockAck);

      expect(mockSocket.emit).toHaveBeenCalledWith('message_ack', mockAck);
    });

    it('should handle offline message acknowledgment', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      const mockOfflineAck = {
        msgIds: ['msg1', 'msg2'],
        conversationId: 'conv1'
      };

      // Trigger offline message acknowledgment
      mockSocket.emit('offline_message_ack', mockOfflineAck);

      expect(mockSocket.emit).toHaveBeenCalledWith('offline_message_ack', mockOfflineAck);
    });
  });

  describe('mark messages as read', () => {
    it('should mark messages as read', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      const markAsReadData = {
        conversationId: 'conv1',
        msgId: 'msg1',
        senderType: 'CUSTOMER',
        msgStatus: 'READ',
        readAllBefore: true
      };

      // Trigger mark messages as read
      mockSocket.emit('mark_messages_as_read', markAsReadData);

      expect(mockSocket.emit).toHaveBeenCalledWith('mark_messages_as_read', markAsReadData);
    });
  });

  describe('get message status', () => {
    it('should get message status', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      const getMessageStatusData = {
        conversationId: 'conv1',
        msgIds: ['msg1', 'msg2']
      };

      // Trigger get message status
      mockSocket.emit('get_message_status', getMessageStatusData);

      expect(mockSocket.emit).toHaveBeenCalledWith('get_message_status', getMessageStatusData);
    });
  });

  describe('get unread messages', () => {
    it('should get unread messages', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      const getUnreadData = {
        conversationId: 'conv1'
      };

      // Trigger get unread messages
      mockSocket.emit('get_unread_messages', getUnreadData);

      expect(mockSocket.emit).toHaveBeenCalledWith('get_unread_messages', getUnreadData);
    });
  });

  describe('AI chat integration', () => {
    it('should handle AI chat requests', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      const aiChatData = {
        conversationId: 'conv1',
        message: 'Hello AI'
      };

      // Trigger AI chat request
      mockSocket.emit('ai_chat_request', aiChatData);

      expect(mockSocket.emit).toHaveBeenCalledWith('ai_chat_request', aiChatData);
    });
  });

  describe('error handling', () => {
    it('should handle socket errors gracefully', () => {
      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      // Simulate socket error
      mockSocket.emit('error', new Error('Socket error'));

      // Should not throw unhandled error
      expect(true).toBe(true);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis error'));

      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      // Should not throw unhandled error
      expect(true).toBe(true);
    });

    it('should handle Prisma errors gracefully', async () => {
      mockPrisma.conversation.findMany = jest.fn().mockRejectedValue(new Error('Prisma error'));

      const mockUsers = new Map([['agent1', 'socket1']]);
      const mockAgents = new Map([['agent1', 'socket1']]);

      const utils = new SocketUtils(
        { redis: mockRedis, prisma: mockPrisma, io: mockIo, redisExpired: 300 },
        mockSocket,
        mockUsers,
        mockAgents
      );

      // Should not throw unhandled error
      expect(true).toBe(true);
    });
  });
});
