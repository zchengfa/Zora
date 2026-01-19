# Zora 测试指南

## 测试结构

```
tests/
├── unit/              # 单元测试
│   ├── components/    # 组件测试
│   ├── plugins/       # 插件工具测试
│   └── zoraServer/   # 服务器API测试
├── integration/       # 集成测试
└── e2e/            # 端到端测试
```

## 测试类型

### 1. 单元测试 (Unit Tests)
测试单个函数、组件或模块的独立功能。

**运行单元测试：**
```bash
npm run test:unit
```

**示例：**
- `plugins/validate.test.ts` - 验证工具函数
- `plugins/token.test.ts` - Token生成和验证
- `components/ZoraChat.test.tsx` - 聊天组件
- `components/ZoraCustomerList.test.tsx` - 客户列表组件

### 2. 集成测试 (Integration Tests)
测试多个模块之间的交互。

**运行集成测试：**
```bash
npm run test:integration
```

**示例：**
- `auth.test.ts` - 完整的认证流程

### 3. 端到端测试 (E2E Tests)
模拟真实用户操作，测试完整的应用流程。

**运行E2E测试：**
```bash
npm run test:e2e
```

**示例：**
- `chat.spec.ts` - 聊天功能完整流程

## 测试命令

```bash
# 运行所有测试
npm test

# 监视模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行E2E测试
npm run test:e2e
```

## 测试覆盖率

项目设置了最低测试覆盖率要求：
- 分支覆盖率: 70%
- 函数覆盖率: 70%
- 行覆盖率: 70%
- 语句覆盖率: 70%

## 添加新测试

### 添加单元测试

1. 在 `tests/unit/` 下创建对应的测试文件
2. 使用 `describe` 和 `it` 组织测试用例
3. 使用 `beforeEach` 和 `afterEach` 设置和清理测试环境
4. Mock外部依赖

示例：
```typescript
import { myFunction } from '../../../path/to/module';

describe('MyFunction Tests', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe('expected');
  });
});
```

### 添加集成测试

1. 在 `tests/integration/` 下创建测试文件
2. 使用 `supertest` 测试API端点
3. Mock数据库和Redis等外部依赖

示例：
```typescript
import request from 'supertest';

describe('API Integration Tests', () => {
  it('should return 200 for valid request', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' });

    expect(response.status).toBe(200);
  });
});
```

### 添加E2E测试

1. 在 `tests/e2e/` 下创建测试文件
2. 使用Playwright API模拟用户操作
3. 测试完整的用户流程

示例：
```typescript
import { test, expect } from '@playwright/test';

test('user flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

## 最佳实践

1. **测试命名**：使用描述性的测试名称，说明测试的内容和预期
2. **独立性**：每个测试应该独立运行，不依赖其他测试
3. **可读性**：测试代码应该清晰易懂
4. **覆盖率**：保持高测试覆盖率，但避免为了覆盖率而写无意义的测试
5. **Mock使用**：合理使用Mock隔离外部依赖
6. **测试数据**：使用固定的测试数据，避免随机性

## 常见问题

### 测试运行失败
- 检查是否正确安装了测试依赖
- 确保环境变量配置正确
- 查看错误日志定位问题

### Mock不生效
- 确保Mock在测试文件顶部正确导入
- 使用 `jest.mock()` 在导入模块前进行Mock
- 检查Mock的路径是否正确

### E2E测试超时
- 增加测试超时时间
- 检查应用是否正常启动
- 优化测试步骤，减少等待时间

## 持续集成

测试会在CI/CD流程中自动运行，确保代码质量。提交代码前请确保：
- 所有测试通过
- 测试覆盖率符合要求
- 没有引入新的测试失败
