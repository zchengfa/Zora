-- CreateTable
CREATE TABLE `customer_addresses` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `address_type` VARCHAR(191) NOT NULL DEFAULT 'shipping',
    `address1` VARCHAR(191) NULL,
    `address2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `postal_code` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_addresses_customer_id_fkey`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_tag_relations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NOT NULL,
    `tag_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_tag_relations_tag_id_fkey`(`tag_id`),
    UNIQUE INDEX `customer_tag_relations_customer_id_tag_id_key`(`customer_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag_name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customer_tags_tag_name_key`(`tag_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `shopify_customer_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `number_of_orders` INTEGER NOT NULL DEFAULT 0,
    `total_amount_spent` DOUBLE NOT NULL DEFAULT 0,
    `currency_code` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `verified_email` BOOLEAN NOT NULL DEFAULT false,
    `valid_email_address` BOOLEAN NOT NULL DEFAULT true,
    `lifetime_duration` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `can_delete` BOOLEAN NOT NULL DEFAULT true,
    `image_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `market_email` BOOLEAN NOT NULL DEFAULT false,
    `market_sms` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `customers_shopify_customer_id_key`(`shopify_customer_id`),
    UNIQUE INDEX `customers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NULL,
    `shop` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
