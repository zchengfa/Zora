-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('NO_RETURN', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_RECEIVED', 'REFUND_PROCESSING', 'REFUND_COMPLETED');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('CNY', 'USD', 'EUR', 'GBP', 'JPY');

-- CreateEnum
CREATE TYPE "FulfillmentOrderStatus" AS ENUM ('CANCELLED', 'CLOSED', 'IN_PROGRESS', 'INCOMPLETE', 'ON_HOLD', 'OPEN', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('CANCELLED', 'ERROR', 'FAILURE', 'SUCCESS');

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

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "customer_tag_relations" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "shop_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" SERIAL NOT NULL,
    "tag_name" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" BIGSERIAL NOT NULL,
    "shopify_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "number_of_orders" TEXT NOT NULL DEFAULT '0',
    "total_amount_spent" TEXT NOT NULL DEFAULT '0.0',
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
    "shop_id" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "shop_owner_name" TEXT NOT NULL,
    "shopify_plus" BOOLEAN NOT NULL DEFAULT false,
    "partner_development" BOOLEAN NOT NULL DEFAULT true,
    "public_display_name" TEXT NOT NULL,
    "shopify_domain" TEXT NOT NULL,
    "is_installed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "department" TEXT,
    "shop_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_settings" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationSound" TEXT NOT NULL DEFAULT 'default',
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoReplyMessage" TEXT,
    "autoReplyDelay" INTEGER NOT NULL DEFAULT 30,
    "workHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
    "workStartHour" TEXT NOT NULL DEFAULT '09:00',
    "workEndHour" TEXT NOT NULL DEFAULT '18:00',
    "workDays" TEXT[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri']::TEXT[],
    "typingIndicator" BOOLEAN NOT NULL DEFAULT true,
    "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    "maxChatHistory" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_service_staff" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "profileId" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,

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
    "shop_id" VARCHAR(100) NOT NULL,
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
    "shop_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_messages" (
    "id" TEXT NOT NULL,
    "conversationId" VARCHAR(191) NOT NULL,
    "recipientId" VARCHAR(191) NOT NULL,
    "recipientType" "RecipientType" NOT NULL,
    "senderId" VARCHAR(191) NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentBody" TEXT NOT NULL,
    "metadata" JSONB,
    "msgId" VARCHAR(100) NOT NULL,
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop_id" TEXT NOT NULL,

    CONSTRAINT "offline_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_list_items" (
    "id" TEXT NOT NULL,
    "conversationId" VARCHAR(191) NOT NULL,
    "customerId" VARCHAR(191) NOT NULL,
    "customerFirstName" TEXT,
    "customerLastName" TEXT,
    "customerAvatar" TEXT,
    "lastMessage" TEXT,
    "lastTimestamp" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "hadRead" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "unreadMessageCount" INTEGER NOT NULL DEFAULT 0,
    "agentId" VARCHAR(191),
    "shop" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shop_id" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "confirmationNumber" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'NO_RETURN',
    "fullyPaid" BOOLEAN NOT NULL DEFAULT false,
    "unpaid" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currencyCode" "CurrencyCode" NOT NULL DEFAULT 'CNY',
    "subtotalPrice" DECIMAL(10,2) NOT NULL,
    "totalTax" DECIMAL(10,2) NOT NULL,
    "totalShippingPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "totalReceived" DECIMAL(10,2) NOT NULL,
    "channelInformation" TEXT DEFAULT 'Online Store',
    "statusPageUrl" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSessionId" TEXT,
    "shopifyOrderId" TEXT,
    "customerId" TEXT,
    "shippingAddressId" TEXT,
    "fulfillmentOrderId" TEXT,
    "order_addressId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_orders" (
    "id" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shop_id" TEXT,
    "status" "FulfillmentOrderStatus" NOT NULL,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_order_line_items" (
    "id" TEXT NOT NULL,
    "shopifyLineItemId" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "shop_id" TEXT,
    "weightUnit" TEXT NOT NULL,
    "weightValue" DECIMAL(10,2) NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillment_order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "carrier" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL,
    "labelUrl" TEXT,
    "trackingUrl" TEXT,
    "shippoShipmentId" TEXT,
    "shippoLabelId" TEXT,
    "shop_id" TEXT,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "weight" DECIMAL(10,2),
    "length" DECIMAL(10,2),
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "distanceUnit" TEXT,
    "massUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eta" TIMESTAMP(3),
    "original_eta" TIMESTAMP(3),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sku" TEXT,
    "shop_id" TEXT NOT NULL,
    "originalUnitPrice" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "variantTitle" TEXT,

    CONSTRAINT "order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_tax_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "ratePercentage" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "source" TEXT,
    "shop_id" TEXT NOT NULL,

    CONSTRAINT "order_tax_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_additional_fees" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "shop_id" TEXT,

    CONSTRAINT "order_additional_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "descriptionHtml" TEXT,
    "tags" TEXT[],
    "vendor" TEXT NOT NULL,
    "featuredMediaId" TEXT,
    "shop_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "minCompareAtPrice" DECIMAL(10,2),
    "maxCompareAtPrice" DECIMAL(10,2),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "currencyCode" TEXT DEFAULT 'USD',
    "sku" TEXT,
    "position" INTEGER,
    "shop_id" TEXT,
    "productId" TEXT NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "mediaContentType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbhash" TEXT,
    "shop_id" TEXT,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_previews" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT,
    "mediaId" TEXT NOT NULL,
    "shop_id" TEXT,

    CONSTRAINT "media_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_counts" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "shop_id" TEXT,

    CONSTRAINT "product_variant_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media_counts" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "shop_id" TEXT,

    CONSTRAINT "product_media_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_translations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER DEFAULT 0,
    "isFeatured" BOOLEAN DEFAULT false,
    "shop_id" TEXT,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" SERIAL NOT NULL,
    "webhookId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChatListItemToCustomerServiceStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChatListItemToCustomerServiceStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductMedia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductMedia_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "customer_tag_relations_tag_id_fkey" ON "customer_tag_relations"("tag_id");

-- CreateIndex
CREATE INDEX "customer_tag_relations_shop_id_idx" ON "customer_tag_relations"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tag_relations_customer_id_tag_id_key" ON "customer_tag_relations"("customer_id", "tag_id");

-- CreateIndex
CREATE INDEX "customer_tags_shop_id_idx" ON "customer_tags"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_shop_id_tag_name_key" ON "customer_tags"("shop_id", "tag_name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_shopify_customer_id_key" ON "customers"("shopify_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shop_id_key" ON "shop"("id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_email_key" ON "shop"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shop_shopify_domain_key" ON "shop"("shopify_domain");

-- CreateIndex
CREATE INDEX "staff_profiles_shop_id_idx" ON "staff_profiles"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_settings_staffProfileId_key" ON "agent_settings"("staffProfileId");

-- CreateIndex
CREATE INDEX "agent_settings_shop_id_idx" ON "agent_settings"("shop_id");

-- CreateIndex
CREATE INDEX "customer_service_staff_shop_id_idx" ON "customer_service_staff"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_staff_profileId_userId_key" ON "customer_service_staff"("profileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_userId_key" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_email_key" ON "session"("email");

-- CreateIndex
CREATE INDEX "conversations_shop_id_status_idx" ON "conversations"("shop_id", "status");

-- CreateIndex
CREATE INDEX "conversations_shop_id_customer_idx" ON "conversations"("shop_id", "customer");

-- CreateIndex
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "messages_senderId_timestamp_idx" ON "messages"("senderId", "timestamp");

-- CreateIndex
CREATE INDEX "messages_shop_id_idx" ON "messages"("shop_id");

-- CreateIndex
CREATE INDEX "offline_messages_recipientId_isDelivered_idx" ON "offline_messages"("recipientId", "isDelivered");

-- CreateIndex
CREATE INDEX "offline_messages_conversationId_idx" ON "offline_messages"("conversationId");

-- CreateIndex
CREATE INDEX "offline_messages_shop_id_idx" ON "offline_messages"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_list_items_conversationId_key" ON "chat_list_items"("conversationId");

-- CreateIndex
CREATE INDEX "chat_list_items_agentId_shop_idx" ON "chat_list_items"("agentId", "shop");

-- CreateIndex
CREATE INDEX "chat_list_items_shop_customerId_idx" ON "chat_list_items"("shop", "customerId");

-- CreateIndex
CREATE INDEX "chat_list_items_lastTimestamp_idx" ON "chat_list_items"("lastTimestamp");

-- CreateIndex
CREATE INDEX "addresses_customerId_idx" ON "addresses"("customerId");

-- CreateIndex
CREATE INDEX "addresses_shop_id_idx" ON "addresses"("shop_id");

-- CreateIndex
CREATE INDEX "addresses_country_province_city_idx" ON "addresses"("country", "province", "city");

-- CreateIndex
CREATE UNIQUE INDEX "orders_name_key" ON "orders"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_confirmationNumber_key" ON "orders"("confirmationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shopifyOrderId_key" ON "orders"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_processedAt_idx" ON "orders"("processedAt");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_confirmationNumber_idx" ON "orders"("confirmationNumber");

-- CreateIndex
CREATE INDEX "orders_shopifyOrderId_idx" ON "orders"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "orders_shop_id_idx" ON "orders"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_orders_shopifyOrderId_key" ON "fulfillment_orders"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "fulfillment_orders_orderId_idx" ON "fulfillment_orders"("orderId");

-- CreateIndex
CREATE INDEX "fulfillment_orders_shop_id_idx" ON "fulfillment_orders"("shop_id");

-- CreateIndex
CREATE INDEX "fulfillment_orders_shopifyOrderId_idx" ON "fulfillment_orders"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "fulfillment_order_line_items_fulfillmentOrderId_idx" ON "fulfillment_order_line_items"("fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "fulfillment_order_line_items_shop_id_idx" ON "fulfillment_order_line_items"("shop_id");

-- CreateIndex
CREATE INDEX "fulfillment_order_line_items_shopifyLineItemId_idx" ON "fulfillment_order_line_items"("shopifyLineItemId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_key" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_shop_id_idx" ON "shipments"("shop_id");

-- CreateIndex
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "order_line_items_orderId_idx" ON "order_line_items"("orderId");

-- CreateIndex
CREATE INDEX "order_line_items_sku_idx" ON "order_line_items"("sku");

-- CreateIndex
CREATE INDEX "order_line_items_shop_id_idx" ON "order_line_items"("shop_id");

-- CreateIndex
CREATE INDEX "order_tax_lines_orderId_idx" ON "order_tax_lines"("orderId");

-- CreateIndex
CREATE INDEX "order_tax_lines_shop_id_idx" ON "order_tax_lines"("shop_id");

-- CreateIndex
CREATE INDEX "order_additional_fees_orderId_idx" ON "order_additional_fees"("orderId");

-- CreateIndex
CREATE INDEX "order_additional_fees_shop_id_idx" ON "order_additional_fees"("shop_id");

-- CreateIndex
CREATE INDEX "products_shop_id_idx" ON "products"("shop_id");

-- CreateIndex
CREATE INDEX "products_vendor_idx" ON "products"("vendor");

-- CreateIndex
CREATE INDEX "products_tags_idx" ON "products"("tags");

-- CreateIndex
CREATE INDEX "variants_productId_idx" ON "variants"("productId");

-- CreateIndex
CREATE INDEX "variants_shop_id_idx" ON "variants"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "variants_productId_position_key" ON "variants"("productId", "position");

-- CreateIndex
CREATE INDEX "media_mediaContentType_idx" ON "media"("mediaContentType");

-- CreateIndex
CREATE INDEX "media_shop_id_idx" ON "media"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_previews_mediaId_key" ON "media_previews"("mediaId");

-- CreateIndex
CREATE INDEX "media_previews_shop_id_idx" ON "media_previews"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_counts_productId_key" ON "product_variant_counts"("productId");

-- CreateIndex
CREATE INDEX "product_variant_counts_shop_id_idx" ON "product_variant_counts"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_counts_productId_key" ON "product_media_counts"("productId");

-- CreateIndex
CREATE INDEX "product_media_counts_shop_id_idx" ON "product_media_counts"("shop_id");

-- CreateIndex
CREATE INDEX "product_translations_productId_idx" ON "product_translations"("productId");

-- CreateIndex
CREATE INDEX "product_translations_locale_idx" ON "product_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "product_translations_productId_locale_fieldName_key" ON "product_translations"("productId", "locale", "fieldName");

-- CreateIndex
CREATE INDEX "product_media_productId_idx" ON "product_media"("productId");

-- CreateIndex
CREATE INDEX "product_media_shop_id_idx" ON "product_media"("shop_id");

-- CreateIndex
CREATE INDEX "product_media_mediaId_idx" ON "product_media"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_productId_mediaId_key" ON "product_media"("productId", "mediaId");

-- CreateIndex
CREATE INDEX "webhook_logs_shop_event_idx" ON "webhook_logs"("shop", "event");

-- CreateIndex
CREATE INDEX "webhook_logs_shop_status_idx" ON "webhook_logs"("shop", "status");

-- CreateIndex
CREATE INDEX "webhook_logs_webhookId_shop_idx" ON "webhook_logs"("webhookId", "shop");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_logs_webhookId_shop_key" ON "webhook_logs"("webhookId", "shop");

-- CreateIndex
CREATE INDEX "_ChatListItemToCustomerServiceStaff_B_index" ON "_ChatListItemToCustomerServiceStaff"("B");

-- CreateIndex
CREATE INDEX "_ProductMedia_B_index" ON "_ProductMedia"("B");

-- AddForeignKey
ALTER TABLE "customer_tag_relations" ADD CONSTRAINT "customer_tag_relations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_settings" ADD CONSTRAINT "agent_settings_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_settings" ADD CONSTRAINT "agent_settings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_staff" ADD CONSTRAINT "customer_service_staff_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_staff" ADD CONSTRAINT "customer_service_staff_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_staff" ADD CONSTRAINT "customer_service_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_messages" ADD CONSTRAINT "offline_messages_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_list_items" ADD CONSTRAINT "chat_list_items_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_list_items" ADD CONSTRAINT "chat_list_items_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("shopify_customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("shopify_customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_addressId_fkey" FOREIGN KEY ("order_addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_order_line_items" ADD CONSTRAINT "fulfillment_order_line_items_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "fulfillment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_order_line_items" ADD CONSTRAINT "fulfillment_order_line_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_tax_lines" ADD CONSTRAINT "order_tax_lines_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_tax_lines" ADD CONSTRAINT "order_tax_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_additional_fees" ADD CONSTRAINT "order_additional_fees_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_additional_fees" ADD CONSTRAINT "order_additional_fees_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_featuredMediaId_fkey" FOREIGN KEY ("featuredMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_previews" ADD CONSTRAINT "media_previews_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_previews" ADD CONSTRAINT "media_previews_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_counts" ADD CONSTRAINT "product_variant_counts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_counts" ADD CONSTRAINT "product_variant_counts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media_counts" ADD CONSTRAINT "product_media_counts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media_counts" ADD CONSTRAINT "product_media_counts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatListItemToCustomerServiceStaff" ADD CONSTRAINT "_ChatListItemToCustomerServiceStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "chat_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatListItemToCustomerServiceStaff" ADD CONSTRAINT "_ChatListItemToCustomerServiceStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "customer_service_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductMedia" ADD CONSTRAINT "_ProductMedia_A_fkey" FOREIGN KEY ("A") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductMedia" ADD CONSTRAINT "_ProductMedia_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
