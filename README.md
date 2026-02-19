# Zora - Shopify Customer Service System

Zora is a powerful customer service system for Shopify, providing comprehensive customer service solutions including real-time customer communication, order management, customer management, and AI-powered intelligent customer service for Shopify merchants. Built with React Router and Socket.IO, it supports real-time message push, Webhook event notifications, and integrates AI capabilities to enhance customer service efficiency.

## Features

### Real-time Customer Service System
- **Real-time Messaging**: WebSocket-based communication using Socket.IO for real-time message transmission between customers and support agents
- **Multi-agent Support**: Support multiple agents online simultaneously with automatic customer session assignment
- **Message Status Tracking**: Real-time tracking of message sending, delivery, and read status
- **Offline Messages**: Store messages when customers are offline and automatically push them when they come online
- **Session Management**: Automatically create and manage customer sessions with status switching support
- **AI-powered Chat**: Integrated AI assistant for intelligent customer service support and automated responses

### Data Synchronization
- **Order Sync**: Real-time synchronization of Shopify order data including create, update, and delete events
- **Customer Sync**: Automatic synchronization of Shopify customer information including create, update, and delete events
- **Product Sync**: Real-time synchronization of Shopify product data including create, update, and delete events
- **Webhook Notifications**: Listen to Shopify Webhook events and push real-time notifications to online agents

### Customer Management
- **Customer Information Management**: View and edit basic customer information
- **Customer Tags**: Add tags to customers for easy categorization and management
- **Customer Order Viewing**: Quickly view customer order history
- **Customer Search**: Search customers by multiple criteria
- **Customer Profile**: Comprehensive customer profiling with value, loyalty, and engagement scores
- **Customer Analytics**: Detailed analytics of customer behavior, preferences, and purchase patterns

### Security & Authentication
- **JWT Authentication**: User authentication using JWT tokens
- **Email Verification**: Email verification code login support
- **Password Encryption**: Password encryption storage using bcrypt
- **Rate Limiting**: Multi-level request rate limiting to prevent API abuse
- **Webhook Validation**: HMAC signature verification for all Shopify webhook events
- **Secure Session Management**: Secure session storage with Redis and automatic expiration

## Tech Stack

### Frontend
- **React 18**: Latest React framework
- **React Router 7**: Routing management based on React Router
- **TypeScript**: Comprehensive TypeScript type support
- **Socket.IO Client**: Real-time messaging
- **Zustand**: Lightweight state management with IndexedDB persistence
- **SCSS**: Style preprocessor
- **Shopify Polaris**: UI component library for Shopify apps
- **Shopify App Bridge**: Embedded app integration

### Backend
- **Node.js**: Runtime environment (>=20.19 <22 || >=22.12)
- **Express**: Web server framework
- **Socket.IO**: WebSocket server with Redis adapter for scaling
- **Prisma**: ORM database access layer
- **PostgreSQL**: Primary database
- **Redis**: Cache and session storage
- **BullMQ**: Task queue management
- **OpenAI SDK**: AI integration for intelligent customer service
- **Winston**: Comprehensive logging system with daily rotation

### Shopify Integration
- **Shopify Admin API**: Interact with Shopify backend
- **Shopify Webhooks**: Listen to Shopify events (orders, customers, products)
- **Shopify App Bridge**: Embedded app integration
- **Shopify CLI**: Development and deployment tooling
- **Shopify Polaris**: UI component library

### AI Integration
- **OpenAI-compatible API**: Support for multiple AI providers
- **Custom AI Tools**: Specialized tools for customer service operations
- **Prompt Engineering**: Optimized prompts for better AI responses
- **Streaming Responses**: Real-time AI response streaming

## Quick Start

### Prerequisites

Before starting, you need:

1. **Node.js**: [Download and install](https://nodejs.org/en/download/) (Version requirement: >=20.19 <22 || >=22.12)
2. **PostgreSQL**: Install and configure PostgreSQL database
3. **Redis**: Install and run Redis server
4. **Shopify Partner Account**: [Create account](https://partners.shopify.com/signup) (if you don't have one)
5. **Test Store**: Set up a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) or [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store) for testing
6. **Shopify CLI**: [Download and install](https://shopify.dev/docs/apps/tools/cli/getting-started) (if you don't have one)
```shell
npm install -g @shopify/cli@latest
```
7. **AI API Key**: Get an API key from your preferred AI provider (OpenAI, Alibaba Cloud Qwen, etc.)

### Installation

1. **Clone the project**
```shell
git clone <your-repository-url>
cd Zora
```

2. **Install dependencies**
```shell
npm install
```

3. **Configure environment variables**

Create `.env` file and configure the following variables:
```env
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,write_products,read_customers,write_customers,read_orders,write_orders
SHOPIFY_APP_URL=your_app_url

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/zora

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Server Configuration
SERVER_ORIGIN=http://localhost:3000,http://localhost:3001

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
```

4. **Initialize database**
```shell
npm run setup
```

5. **Start development server**
```shell
# Start main app
npm run dev

# Start Zora server and workers (in a separate terminal)
npm run zoraServer-worker
```

### Development Workflow

The project consists of two main parts:
1. **Main App**: Shopify embedded app (runs on port 3000)
2. **Zora Server**: Backend server with Socket.IO and workers (runs on port 3001)

Both servers need to be running for full functionality. The Zora server includes:
- Socket.IO server for real-time messaging
- API endpoints for customer service operations
- Background workers for:
  - Logging
  - Shopify data synchronization
  - Message processing
  - Health monitoring

## Deployment

### Deployment Preparation

1. Ensure all environment variables are properly configured
2. Set `NODE_ENV=production`
3. Configure production database and Redis connections
4. Configure HTTPS and domain
5. Set up proper CORS origins in SERVER_ORIGIN

### Deployment Steps

1. **Build the application**
```shell
npm run build
```

2. **Run database migrations**
```shell
npm run setup
```

3. **Start the application**
```shell
npm run start
```

4. **Start Zora server**
```shell
npm run zora-server
```

### Using PM2 for Process Management

For production deployment, it's recommended to use PM2 to manage the processes:
```shell
# Install PM2
npm install -g pm2

# Start all processes using ecosystem.config.js
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor processes
pm2 monit
```

### Recommended Cloud Providers

- **App Hosting**: [Heroku](https://www.heroku.com/), [Fly.io](https://fly.io/), [Vercel](https://vercel.com/)
- **Database**: [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases/), [Amazon RDS](https://aws.amazon.com/rds/)
- **Redis**: [DigitalOcean Managed Redis](https://www.digitalocean.com/products/managed-databases-redis), [Amazon MemoryDB](https://aws.amazon.com/memorydb/)

## Project Structure

```
Zora/
├── app/                    # Frontend application
│   ├── components/          # React components
│   ├── routes/             # Route handlers
│   ├── hooks/              # Custom React hooks
│   ├── Utils/              # Utility functions
│   └── styles/             # SCSS stylesheets
├── zoraServer/             # Backend server
│   ├── socketServer.ts      # Socket.IO server
│   ├── webhooks.ts         # Shopify webhook handlers
│   └── zoraApi.ts          # API endpoints
├── plugins/                # Backend plugins and utilities
│   ├── aiTools.ts          # AI tool functions
│   ├── customerProfile.ts   # Customer profiling
│   ├── shopifyUtils.ts     # Shopify API utilities
│   └── socketUtils.ts      # Socket utilities
├── prisma/                 # Database schema and migrations
├── tests/                  # Test files
└── extensions/             # Shopify app extensions
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature')`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Contact

For questions or suggestions, please contact:

- Submit an Issue
- Email: support@example.com

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Resources

### Documentation
- [React Router Docs](https://reactrouter.com/home)
- [Shopify App Development](https://shopify.dev/docs/apps/getting-started)
- [Shopify App React Router Docs](https://shopify.dev/docs/api/shopify-app-react-router)
- [Socket.IO Docs](https://socket.io/docs/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Shopify CLI Docs](https://shopify.dev/docs/apps/tools/cli)

### AI Integration
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Alibaba Cloud Qwen](https://help.aliyun.com/zh/dashscope/)

### Tools & Libraries
- [Zustand](https://github.com/pmndrs/zustand)
- [BullMQ](https://docs.bullmq.io/)
- [Winston](https://github.com/winstonjs/winston)

## Architecture Overview

### Frontend Architecture

- **Component-based**: Modular React components for UI elements
- **State Management**: Zustand with IndexedDB persistence for offline capability
- **Routing**: React Router 7 for client-side routing
- **Real-time Updates**: Socket.IO client for instant message updates
- **Internationalization**: Multi-language support with custom translation system

### Backend Architecture

- **Microservices-like**: Separate services for different concerns
  - Main API server (Express)
  - Socket.IO server for real-time communication
  - Background workers for async tasks
- **Data Layer**: Prisma ORM with PostgreSQL
- **Caching**: Redis for session management and data caching
- **Task Queue**: BullMQ for background job processing
- **Logging**: Winston with daily log rotation

### Data Flow

1. **Customer Messages**:
   - Customer sends message via Socket.IO
   - Server processes and stores in database
   - Message pushed to assigned agent in real-time
   - Agent responds via Socket.IO
   - Response delivered to customer

2. **Shopify Events**:
   - Webhook received from Shopify
   - Event validated and processed
   - Data synchronized to local database
   - Notification pushed to online agents

3. **AI Interactions**:
   - User or agent sends query to AI
   - AI processes with context (customer data, orders, etc.)
   - Response streamed back in real-time
   - Optional tool calls for data retrieval

## Troubleshooting

### Common Issues

1. **Socket.IO Connection Issues**
   - Ensure Redis is running
   - Check CORS configuration in SERVER_ORIGIN
   - Verify firewall settings

2. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Check PostgreSQL is running
   - Ensure migrations have been run

3. **Worker Health Checks Failing**
   - Check if worker processes are running
   - Verify Redis connection
   - Check worker logs for errors

4. **AI Integration Issues**
   - Verify OPENAI_API_KEY is valid
   - Check OPENAI_API_BASE_URL is correct
   - Ensure model name matches provider

## Upgrading from Remix

If you have an existing Remix app that you want to upgrade to React Router, please follow the [upgrade guide](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix). Otherwise, please follow the quick start guide above.

## Quick start

### Prerequisites

Before you begin, you'll need the following:

1. **Node.js**: [Download and install](https://nodejs.org/en/download/) it if you haven't already.
2. **Shopify Partner Account**: [Create an account](https://partners.shopify.com/signup) if you don't have one.
3. **Test Store**: Set up either a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) or a [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store) for testing your app.
4. **Shopify CLI**: [Download and install](https://shopify.dev/docs/apps/tools/cli/getting-started) it if you haven't already.
```shell
npm install -g @shopify/cli@latest
```

### Setup

```shell
shopify app init --template=https://github.com/Shopify/shopify-app-template-react-router
```

### Local Development

```shell
shopify app dev
```

Press P to open the URL to your app. Once you click install, you can start development.

Local development is powered by [the Shopify CLI](https://shopify.dev/docs/apps/tools/cli). It logs into your partners account, connects to an app, provides environment variables, updates remote config, creates a tunnel and provides commands to generate extensions.

### Authenticating and querying data

To authenticate and query data you can use the `shopify` const that is exported from `/app/shopify.server.js`:

```js
export async function loader({ request }) {
  const { admin } = await shopify.authenticate.admin(request);

  const response = await admin.graphql(`
    {
      products(first: 25) {
        nodes {
          title
          description
        }
      }
    }`);

  const {
    data: {
      products: { nodes },
    },
  } = await response.json();

  return nodes;
}
```

This template comes pre-configured with examples of:

1. Setting up your Shopify app in [/app/shopify.server.ts](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/shopify.server.ts)
2. Querying data using Graphql. Please see: [/app/routes/app.\_index.tsx](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/routes/app._index.tsx).
3. Responding to webhooks. Please see [/app/routes/webhooks.tsx](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/routes/webhooks.app.uninstalled.tsx).

Please read the [documentation for @shopify/shopify-app-react-router](https://shopify.dev/docs/api/shopify-app-react-router) to see what other API's are available.

## Shopify Dev MCP

This template is configured with the Shopify Dev MCP. This instructs [Cursor](https://cursor.com/), [GitHub Copilot](https://github.com/features/copilot) and [Claude Code](https://claude.com/product/claude-code) and [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) to use the Shopify Dev MCP.  

For more information on the Shopify Dev MCP please read [the  documentation](https://shopify.dev/docs/apps/build/devmcp).

## Deployment

### Application Storage

This template uses [Prisma](https://www.prisma.io/) to store session data, by default using an [SQLite](https://www.sqlite.org/index.html) database.
The database is defined as a Prisma schema in `prisma/schema.prisma`.

This use of SQLite works in production if your app runs as a single instance.
The database that works best for you depends on the data your app needs and how it is queried.
Here’s a short list of databases providers that provide a free tier to get started:

| Database   | Type             | Hosters                                                                                                                                                                                                                               |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MySQL      | SQL              | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mysql), [Planet Scale](https://planetscale.com/), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/mysql) |
| PostgreSQL | SQL              | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-postgresql), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/postgres)                                   |
| Redis      | Key-value        | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-redis), [Amazon MemoryDB](https://aws.amazon.com/memorydb/)                                                                                                        |
| MongoDB    | NoSQL / Document | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mongodb), [MongoDB Atlas](https://www.mongodb.com/atlas/database)                                                                                                  |

To use one of these, you can use a different [datasource provider](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datasource) in your `schema.prisma` file, or a different [SessionStorage adapter package](https://github.com/Shopify/shopify-api-js/blob/main/packages/shopify-api/docs/guides/session-storage.md).

### Build

Build the app by running the command below with the package manager of your choice:

Using yarn:

```shell
yarn build
```

Using npm:

```shell
npm run build
```

Using pnpm:

```shell
pnpm run build
```

## Hosting

When you're ready to set up your app in production, you can follow [our deployment documentation](https://shopify.dev/docs/apps/deployment/web) to host your app on a cloud provider like [Heroku](https://www.heroku.com/) or [Fly.io](https://fly.io/).

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.


## Gotchas / Troubleshooting

### Database tables don't exist

If you get an error like:

```
The table `main.Session` does not exist in the current database.
```

Create the database for Prisma. Run the `setup` script in `package.json` using `npm`, `yarn` or `pnpm`.

### Navigating/redirecting breaks an embedded app

Embedded apps must maintain the user session, which can be tricky inside an iFrame. To avoid issues:

1. Use `Link` from `react-router` or `@shopify/polaris`. Do not use `<a>`.
2. Use `redirect` returned from `authenticate.admin`. Do not use `redirect` from `react-router`
3. Use `useSubmit` from `react-router`.

This only applies if your app is embedded, which it will be by default.

### Webhooks: shop-specific webhook subscriptions aren't updated

If you are registering webhooks in the `afterAuth` hook, using `shopify.registerWebhooks`, you may find that your subscriptions aren't being updated.  

Instead of using the `afterAuth` hook declare app-specific webhooks in the `shopify.app.toml` file.  This approach is easier since Shopify will automatically sync changes every time you run `deploy` (e.g: `npm run deploy`).  Please read these guides to understand more:

1. [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions)
2. [Create a subscription tutorial](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?deliveryMethod=https)

If you do need shop-specific webhooks, keep in mind that the package calls `afterAuth` in 2 scenarios:

- After installing the app
- When an access token expires

During normal development, the app won't need to re-authenticate most of the time, so shop-specific subscriptions aren't updated. To force your app to update the subscriptions, uninstall and reinstall the app. Revisiting the app will call the `afterAuth` hook.

### Webhooks: Admin created webhook failing HMAC validation

Webhooks subscriptions created in the [Shopify admin](https://help.shopify.com/en/manual/orders/notifications/webhooks) will fail HMAC validation. This is because the webhook payload is not signed with your app's secret key.  

The recommended solution is to use [app-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions) defined in your toml file instead.  Test your webhooks by triggering events manually in the Shopify admin(e.g. Updating the product title to trigger a `PRODUCTS_UPDATE`).

### Webhooks: Admin object undefined on webhook events triggered by the CLI

When you trigger a webhook event using the Shopify CLI, the `admin` object will be `undefined`. This is because the CLI triggers an event with a valid, but non-existent, shop. The `admin` object is only available when the webhook is triggered by a shop that has installed the app.  This is expected.

Webhooks triggered by the CLI are intended for initial experimentation testing of your webhook configuration. For more information on how to test your webhooks, see the [Shopify CLI documentation](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger).

### Incorrect GraphQL Hints

By default the [graphql.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension for will assume that GraphQL queries or mutations are for the [Shopify Admin API](https://shopify.dev/docs/api/admin). This is a sensible default, but it may not be true if:

1. You use another Shopify API such as the storefront API.
2. You use a third party GraphQL API.

If so, please update [.graphqlrc.ts](https://github.com/Shopify/shopify-app-template-react-router/blob/main/.graphqlrc.ts).

### Using Defer & await for streaming responses

By default the CLI uses a cloudflare tunnel. Unfortunately  cloudflare tunnels wait for the Response stream to finish, then sends one chunk.  This will not affect production.

To test [streaming using await](https://reactrouter.com/api/components/Await#await) during local development we recommend [localhost based development](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options#localhost-based-development).

### "nbf" claim timestamp check failed

This is because a JWT token is expired.  If you  are consistently getting this error, it could be that the clock on your machine is not in sync with the server.  To fix this ensure you have enabled "Set time and date automatically" in the "Date and Time" settings on your computer.

### Using MongoDB and Prisma

If you choose to use MongoDB with Prisma, there are some gotchas in Prisma's MongoDB support to be aware of. Please see the [Prisma SessionStorage README](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-prisma#mongodb).

## Resources

React Router:

- [React Router docs](https://reactrouter.com/home)

Shopify:

- [Intro to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [Shopify App React Router docs](https://shopify.dev/docs/api/shopify-app-react-router)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge-library).
- [Polaris Web Components](https://shopify.dev/docs/api/app-home/polaris-web-components).
- [App extensions](https://shopify.dev/docs/apps/app-extensions/list)
- [Shopify Functions](https://shopify.dev/docs/api/functions)

Internationalization:

- [Internationalizing your app](https://shopify.dev/docs/apps/best-practices/internationalization/getting-started)
