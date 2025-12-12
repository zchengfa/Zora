-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('CUSTOMER', 'AGENT');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'IMAGE', 'PRODUCT', 'ORDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MsgStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "address_type" TEXT NOT NULL DEFAULT 'shipping',
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_relations" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" SERIAL NOT NULL,
    "tag_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" BIGSERIAL NOT NULL,
    "shopify_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "number_of_orders" INTEGER NOT NULL DEFAULT 0,
    "total_amount_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "verified_email" BOOLEAN NOT NULL DEFAULT false,
    "valid_email_address" BOOLEAN NOT NULL DEFAULT true,
    "lifetime_duration" TEXT,
    "note" TEXT,
    "can_delete" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "market_email" BOOLEAN NOT NULL DEFAULT false,
    "market_sms" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_service_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "userId" BIGINT,

    CONSTRAINT "customer_service_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "shop" TEXT,
    "state" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "shop" VARCHAR(100) NOT NULL,
    "customer" VARCHAR(100),
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" VARCHAR(191) NOT NULL,
    "owner" VARCHAR(100),
    "msgStatus" "MsgStatus",
    "senderId" VARCHAR(191) NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "recipientId" VARCHAR(191),
    "recipientType" "RecipientType",
    "contentType" "ContentType" NOT NULL DEFAULT 'TEXT',
    "contentBody" TEXT NOT NULL,
    "metadata" JSONB,
    "msgId" VARCHAR(100),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_fkey" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "customer_tag_relations_tag_id_fkey" ON "customer_tag_relations"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tag_relations_customer_id_tag_id_key" ON "customer_tag_relations"("customer_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_tag_name_key" ON "customer_tags"("tag_name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_shopify_customer_id_key" ON "customers"("shopify_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_staff_id_key" ON "customer_service_staff"("id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_staff_email_key" ON "customer_service_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_staff_userId_key" ON "customer_service_staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_userId_key" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_email_key" ON "session"("email");

-- CreateIndex
CREATE INDEX "conversations_shop_status_idx" ON "conversations"("shop", "status");

-- CreateIndex
CREATE INDEX "conversations_shop_customer_idx" ON "conversations"("shop", "customer");

-- CreateIndex
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "messages_senderId_timestamp_idx" ON "messages"("senderId", "timestamp");

-- AddForeignKey
ALTER TABLE "customer_service_staff" ADD CONSTRAINT "customer_service_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
