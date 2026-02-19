# 部署 Zora 到 Render

本指南将帮助您将 Zora 项目部署到 Render 平台。

## 前提条件

1. [Render 账户](https://render.com/register)
2. [GitHub 账户](https://github.com/signup)
3. 将项目推送到 GitHub 仓库
4. 准备好以下服务的生产环境：
   - PostgreSQL 数据库
   - Redis 实例

## 部署架构

Zora 需要部署以下服务：

1. **Web 服务** - 主应用 (React Router 应用)
2. **Web 服务** - Zora Server (Express + Socket.IO 服务器)
3. **PostgreSQL 数据库** - 主数据库
4. **Redis** - 缓存和会话存储

## 部署步骤

### 1. 准备 GitHub 仓库

将您的项目推送到 GitHub 仓库，确保包含以下文件：
- `package.json`
- `Dockerfile`
- `.env.example` (如果有的话)
- 所有必要的源代码文件

### 2. 在 Render 上创建 PostgreSQL 数据库

1. 登录 Render 控制台
2. 点击 "New+" -> "PostgreSQL"
3. 配置数据库：
   - Name: `zora-db`
   - Database: `zora`
   - User: `zora`
   - Region: 选择离您用户最近的区域
   - PostgreSQL Version: 选择最新稳定版
4. 点击 "Create Database"
5. 创建后，复制 "Internal Database URL"，格式类似：`postgresql://zora:password@dpg-xxx.oregon-postgres.render.com/zora`

### 3. 在 Render 上创建 Redis 实例

1. 点击 "New+" -> "Redis"
2. 配置 Redis：
   - Name: `zora-redis`
   - Region: 与数据库相同的区域
3. 点击 "Create Redis"
4. 创建后，复制 "Internal Redis URL"，格式类似：`rediss://default:password@xxx-oregon-1.render.com`

### 4. 准备环境变量

在部署应用之前，您需要准备以下环境变量：

```env
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,write_products,read_customers,write_customers,read_orders,write_orders
SHOPIFY_APP_URL=https://your-app-name.onrender.com

# Database Configuration
DATABASE_URL=postgresql://zora:password@dpg-xxx.oregon-postgres.render.com/zora

# Redis Configuration
REDIS_HOST=xxx-oregon-1.render.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Server Configuration
SERVER_ORIGIN=https://your-app-name.onrender.com,https://your-zora-server.onrender.com

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# AI Configuration
OPENAI_API_KEY=your_ai_api_key
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4

# Worker Health Check Keys
LOGGER_WORKER_HEALTH_KEY=logger
OFFLINE_MESSAGE_WORKER_HEALTH_KEY=message
SHOPIFY_WORKER_HEALTH_KEY=shopify

# Render Configuration
NODE_ENV=production
PORT=3000  # 主应用端口
ZORA_SERVER_PORT=3001  # Zora Server 端口
```

### 5. 部署主应用

1. 点击 "New+" -> "Web Service"
2. 连接您的 GitHub 仓库
3. 配置服务：
   - Name: `zora-app`
   - Environment: `Docker`
   - Branch: `main` (或您的生产分支)
   - Docker Context: `/`
   - Dockerfile Path: `./Dockerfile`
4. 添加环境变量（参考上面的环境变量列表）
5. 点击 "Create Web Service"

### 6. 部署 Zora Server

1. 点击 "New+" -> "Web Service"
2. 连接相同的 GitHub 仓库
3. 配置服务：
   - Name: `zora-server`
   - Environment: `Docker`
   - Branch: `main`
   - Docker Context: `/`
   - Dockerfile Path: `./Dockerfile`
4. 添加环境变量（与主应用相同，但 PORT 设置为 3001）
5. 修改启动命令：
   - 在 "Advanced" -> "Start Command" 中输入：
   ```
   npm run build:node && node dist/zoraServer/zoraServer.js.cjs
   ```
6. 点击 "Create Web Service"

### 7. 配置 Shopify App

1. 登录到 [Shopify Partner Dashboard](https://partners.shopify.com/)
2. 找到您的应用
3. 更新应用 URL 为：`https://zora-app.onrender.com`
4. 配置允许的重定向 URL：`https://zora-app.onrender.com/auth/callback`
5. 保存更改

### 8. 配置 Webhook

1. 在 Shopify Partner Dashboard 中，为您的应用添加以下 Webhook：
   - Orders/create: `https://zora-server.onrender.com/webhooks/orders/create`
   - Orders/updated: `https://zora-server.onrender.com/webhooks/orders/updated`
   - Orders/delete: `https://zora-server.onrender.com/webhooks/orders/delete`
   - Customers/create: `https://zora-server.onrender.com/webhooks/customers/create`
   - Customers/update: `https://zora-server.onrender.com/webhooks/customers/update`
   - Customers/delete: `https://zora-server.onrender.com/webhooks/customers/delete`
   - Products/create: `https://zora-server.onrender.com/webhooks/products/create`
   - Products/update: `https://zora-server.onrender.com/webhooks/products/update`
   - Products/delete: `https://zora-server.onrender.com/webhooks/products/delete`
   - App/uninstalled: `https://zora-server.onrender.com/webhooks/app/uninstalled`

### 9. 更新环境变量

根据实际部署的 URL，更新以下环境变量：

```env
SHOPIFY_APP_URL=https://zora-app.onrender.com
SERVER_ORIGIN=https://zora-app.onrender.com,https://zora-server.onrender.com
```

### 10. 验证部署

1. 访问 `https://zora-app.onrender.com` 确保主应用正常运行
2. 访问 `https://zora-server.onrender.com` 确保服务器正常运行
3. 检查 Render 日志确保没有错误
4. 测试 Shopify App 功能

## 故障排除

### 主应用无法启动

1. 检查 Render 日志中的错误信息
2. 确保所有环境变量已正确配置
3. 验证数据库连接字符串是否正确
4. 确认 Dockerfile 中的构建步骤是否正确

### Zora Server 无法启动

1. 检查 Zora Server 的日志
2. 确认端口 3001 是否正确配置
3. 验证 Redis 连接是否正常
4. 检查 Socket.IO 是否正确初始化

### Webhook 不工作

1. 验证 Webhook URL 是否可访问
2. 检查 Shopify Partner Dashboard 中的 Webhook 配置
3. 确认 HMAC 验证是否通过
4. 查看服务器日志中的错误信息

### 数据库连接问题

1. 验证 DATABASE_URL 是否正确
2. 确保数据库已创建并运行
3. 检查数据库访问权限
4. 运行数据库迁移：`npm run setup`

### Redis 连接问题

1. 验证 Redis 连接字符串是否正确
2. 确保密码已正确配置
3. 检查 Redis 实例是否运行正常

## 监控和维护

1. 定期检查 Render 控制台中的日志
2. 监控数据库和 Redis 的使用情况
3. 设置 Render 的自动部署功能
4. 定期备份数据库
5. 监控应用性能和错误率

## 性能优化建议

1. 使用 Render 的付费计划获得更好的性能
2. 配置数据库连接池
3. 启用 Redis 缓存
4. 使用 CDN 加速静态资源
5. 配置自动扩展规则

## 成本估算

- 免费计划：
  - Web 服务：有限制
  - PostgreSQL：90 天免费试用
  - Redis：90 天免费试用

- 付费计划（推荐生产环境）：
  - Web 服务：$7/月起
  - PostgreSQL：$7/月起
  - Redis：$7/月起

## 联系支持

如果遇到部署问题，可以：
1. 查看 Render 文档：https://render.com/docs
2. 查看项目 README.md
3. 提交 GitHub Issue
4. 联系技术支持

## 下一步

部署完成后，您可以：
1. 配置自定义域名
2. 设置 SSL 证书
3. 配置监控和告警
4. 设置自动备份
5. 优化应用性能
