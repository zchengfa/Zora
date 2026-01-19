# Zora - Shopify 客服系统

Zora是一个功能强大的Shopify客服系统，为Shopify商家提供实时客户沟通、订单管理、客户管理等全方位的客户服务解决方案。基于React Router和Socket.IO构建，支持实时消息推送和Webhook事件通知。

## 功能特性

### 实时客服系统
- **实时消息通信**: 基于Socket.IO的WebSocket连接，实现客户与客服之间的实时消息传输
- **多客服支持**: 支持多个客服同时在线，自动分配客户会话
- **消息状态追踪**: 实时追踪消息发送、送达、已读等状态
- **离线消息**: 支持离线消息存储，客户离线时消息自动保存，上线后推送
- **会话管理**: 自动创建和管理客户会话，支持会话状态切换

### 数据同步
- **订单同步**: 实时同步Shopify订单数据，包括创建、更新、删除等事件
- **客户同步**: 自动同步Shopify客户信息，包括创建、更新、删除等事件
- **产品同步**: 实时同步Shopify产品数据，包括创建、更新、删除等事件
- **Webhook通知**: 监听Shopify Webhook事件，实时推送通知给在线客服

### 客户管理
- **客户信息管理**: 查看和编辑客户基本信息
- **客户标签**: 支持为客户添加标签，便于分类管理
- **客户订单查看**: 快速查看客户的历史订单
- **客户搜索**: 支持通过多种条件搜索客户

### 安全与认证
- **JWT认证**: 使用JWT进行用户身份验证
- **邮件验证**: 支持邮箱验证码登录
- **密码加密**: 使用bcrypt进行密码加密存储
- **请求限流**: 实现多级请求限流，防止API滥用

## 技术栈

### 前端
- **React 18**: 使用最新版本的React框架
- **React Router 7**: 基于React Router的路由管理
- **TypeScript**: 全面的TypeScript类型支持
- **Socket.IO Client**: 实时消息通信
- **Zustand**: 轻量级状态管理
- **SCSS**: 样式预处理器

### 后端
- **Node.js**: 运行时环境
- **Express**: Web服务器框架
- **Socket.IO**: WebSocket服务器
- **Prisma**: ORM数据库访问层
- **PostgreSQL**: 主数据库
- **Redis**: 缓存和会话存储
- **BullMQ**: 任务队列管理

### Shopify集成
- **Shopify Admin API**: 与Shopify后台交互
- **Shopify Webhooks**: 监听Shopify事件
- **Shopify App Bridge**: 嵌入式应用集成

## 项目结构

```
Zora/
├── app/                    # 前端应用目录
│   ├── components/         # React组件
│   ├── hooks/             # 自定义Hooks
│   ├── routes/            # 路由页面
│   ├── Utils/             # 工具函数
│   ├── contexts/          # React Context
│   ├── network/           # 网络请求
│   └── zustand/           # Zustand状态管理
├── plugins/               # 后端插件
│   ├── axios.ts           # Axios封装
│   ├── bullTaskQueue.ts   # BullMQ任务队列
│   ├── emailHtml.ts       # 邮件模板
│   ├── handleZoraError.ts # 错误处理
│   ├── interceptors.ts    # 请求拦截器
│   ├── logger.ts          # 日志系统
│   ├── prismaClient.ts    # Prisma客户端
│   ├── redisClient.ts      # Redis客户端
│   ├── shopifyUtils.ts    # Shopify工具
│   ├── socketUtils.ts     # Socket工具
│   ├── sync.ts            # 数据同步
│   ├── token.ts           # JWT令牌
│   ├── validate.ts        # 数据验证
│   └── workerHealth.ts    # Worker健康检查
├── zoraServer/            # Zora服务器
│   ├── socketServer.ts    # Socket.IO服务器
│   ├── webhooks.ts       # Webhook处理
│   ├── zoraApi.ts        # API路由
│   └── zoraServer.ts     # 服务器入口
├── prisma/               # Prisma配置
│   ├── schema.prisma     # 数据库模型
│   └── migrations/       # 数据库迁移
└── extensions/           # Shopify扩展
```

## 快速开始

### 前置要求

在开始之前，您需要准备以下内容：

1. **Node.js**: [下载并安装](https://nodejs.org/en/download/) (版本要求: >=20.19 <22 || >=22.12)
2. **PostgreSQL**: 安装并配置PostgreSQL数据库
3. **Redis**: 安装并运行Redis服务器
4. **Shopify Partner账户**: [创建账户](https://partners.shopify.com/signup) (如果还没有)
5. **测试店铺**: 设置一个[开发店铺](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store)或[Shopify Plus沙盒店铺](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store)用于测试
6. **Shopify CLI**: [下载并安装](https://shopify.dev/docs/apps/tools/cli/getting-started) (如果还没有)
```shell
npm install -g @shopify/cli@latest
```

### 安装步骤

1. **克隆项目**
```shell
git clone <your-repository-url>
cd Zora
```

2. **安装依赖**
```shell
npm install
```

3. **配置环境变量**

创建`.env`文件并配置以下变量：
```env
# Shopify配置
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,write_products,read_customers,write_customers,read_orders,write_orders
SHOPIFY_APP_URL=your_app_url

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/zora

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 服务器配置
SERVER_ORIGIN=http://localhost:3000,http://localhost:3001

# JWT配置
JWT_SECRET=your_jwt_secret

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

4. **初始化数据库**
```shell
npm run setup
```

5. **启动开发服务器**
```shell
# 启动主应用
npm run dev

# 启动Zora服务器和Worker
npm run zoraServer-worker
```

## 部署

### 部署准备

1. 确保所有环境变量已正确配置
2. 设置`NODE_ENV=production`
3. 配置生产数据库和Redis连接
4. 配置HTTPS和域名

### 部署步骤

1. **构建应用**
```shell
npm run build
```

2. **运行数据库迁移**
```shell
npm run setup
```

3. **启动应用**
```shell
npm run start
```

4. **启动Zora服务器**
```shell
npm run zora-server
```

### 推荐的云服务提供商

- **应用托管**: [Heroku](https://www.heroku.com/)、[Fly.io](https://fly.io/)、[Vercel](https://vercel.com/)
- **数据库**: [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases/)、[Amazon RDS](https://aws.amazon.com/rds/)
- **Redis**: [DigitalOcean Managed Redis](https://www.digitalocean.com/products/managed-databases-redis)、[Amazon MemoryDB](https://aws.amazon.com/memorydb/)

## 常见问题

### 数据库连接失败

确保PostgreSQL服务正在运行，并且`DATABASE_URL`配置正确。

### Redis连接失败

确保Redis服务正在运行，并且Redis配置正确。

### Socket连接失败

检查`SERVER_ORIGIN`环境变量是否包含正确的URL，并确保CORS配置正确。

### Webhook验证失败

确保`SHOPIFY_API_SECRET`配置正确，并且Webhook URL可以通过公网访问。

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用MIT许可证 - 详见LICENSE文件

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交Issue
- 发送邮件至: support@example.com

## 资源链接

- [React Router文档](https://reactrouter.com/home)
- [Shopify应用开发文档](https://shopify.dev/docs/apps/getting-started)
- [Shopify App React Router文档](https://shopify.dev/docs/api/shopify-app-react-router)
- [Socket.IO文档](https://socket.io/docs/)
- [Prisma文档](https://www.prisma.io/docs)
- [Shopify CLI文档](https://shopify.dev/docs/apps/tools/cli)
