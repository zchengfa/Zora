// Jest setup file
import { TextEncoder, TextDecoder } from 'util';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SHOPIFY_API_SECRET = 'test_secret_key';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.SERVER_ORIGIN = 'http://localhost:3000';

// Setup TextEncoder and TextDecoder for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch if needed
global.fetch = jest.fn() as any;

// Setup test timeout
jest.setTimeout(10000);

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
