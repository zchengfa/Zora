module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/e2e'], // 排除E2E测试
  transformIgnorePatterns: [
    'node_modules/(?!(bullmq|ioredis|@prisma/client)/)',
  ],
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@hooks/(.*)$': '<rootDir>/app/hooks/$1',
    '^@Utils/(.*)$': '<rootDir>/app/Utils/$1',
    '^@zustand/(.*)$': '<rootDir>/app/zustand/$1',
    '^@network/(.*)$': '<rootDir>/app/network/$1'
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'plugins/**/*.ts',
    'zoraServer/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000
};
