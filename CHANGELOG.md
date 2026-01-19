# Zora - Changelog

This document records all important changes to the Zora project.

## [1.0.0] - 2025-01-20

### New Features

#### Real-time Customer Service System
- Implemented Socket.IO-based real-time messaging system
- Support for multiple agents online simultaneously with automatic connection management
- Implemented automatic session creation/restoration when customers come online
- Added message status tracking (sent, delivered, read)
- Implemented offline message storage and push functionality

#### Data Synchronization
- Implemented real-time Shopify order data synchronization (create, update, delete)
- Implemented real-time Shopify customer data synchronization (create, update, delete)
- Implemented real-time Shopify product data synchronization (create, update, delete)
- Added Webhook event listening and processing
- Implemented real-time Webhook event push to online agents

#### Customer Management
- Implemented customer information query and display
- Added customer search functionality
- Implemented customer tagging system
- Added customer order viewing functionality

#### Security & Authentication
- Implemented JWT authentication
- Added email verification code login
- Used bcrypt for password encryption
- Implemented multi-level request rate limiting

#### API Endpoints
- Implemented user authentication endpoints
- Implemented customer management endpoints
- Implemented order query endpoints
- Implemented product query endpoints
- Implemented message sending and history query endpoints

#### Background Services
- Implemented logger Worker for unified application log management
- Implemented Shopify Worker for handling Shopify-related tasks
- Added Worker health check mechanism
- Implemented task queue management (BullMQ)

### Technical Improvements

- Refactored application routing using React Router 7
- Fully adopted TypeScript for enhanced type safety
- Used Zustand for state management
- Used Prisma as ORM tool
- Used PostgreSQL as primary database
- Used Redis for caching and session management

### Performance Optimizations

- Implemented Redis caching to reduce database queries
- Optimized Socket.IO connection management
- Implemented request interception and error handling
- Added data synchronization optimization mechanisms

### Bug Fixes

- Fixed Socket.IO connection disconnect and reconnection issues
- Fixed Webhook validation failures
- Fixed offline message push issues
- Fixed customer session state synchronization issues
