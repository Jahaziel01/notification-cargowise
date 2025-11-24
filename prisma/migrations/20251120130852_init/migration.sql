-- CreateTable
CREATE TABLE `PreAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messageKey` VARCHAR(255) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'PRE_ALERT',
    `shipment` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `recipients` MEDIUMTEXT NOT NULL,
    `cc` MEDIUMTEXT NOT NULL,
    `consol` VARCHAR(255) NOT NULL,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `user` VARCHAR(255) NULL,
    `isAnswered` BOOLEAN NOT NULL DEFAULT false,
    `closed` BOOLEAN NOT NULL DEFAULT false,
    `description` LONGTEXT NULL,
    `json` JSON NULL,
    `answeredBy` VARCHAR(255) NULL,
    `etaAt` DATETIME(3) NULL,
    `answeredAt` DATETIME(3) NULL,
    `arrivalNoticeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PreAlert_messageKey_key`(`messageKey`),
    UNIQUE INDEX `PreAlert_shipment_key`(`shipment`),
    UNIQUE INDEX `PreAlert_subject_key`(`subject`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArrivalNotice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `messageKey` VARCHAR(255) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'ARRIVAL_NOTICE',
    `shipment` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `consol` VARCHAR(255) NOT NULL,
    `recipients` MEDIUMTEXT NOT NULL,
    `cc` MEDIUMTEXT NOT NULL,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `user` VARCHAR(255) NULL,
    `isAnswered` BOOLEAN NOT NULL DEFAULT false,
    `closed` BOOLEAN NOT NULL DEFAULT false,
    `attachment` BOOLEAN NOT NULL DEFAULT false,
    `answeredBy` VARCHAR(255) NULL,
    `ataAt` DATETIME(3) NULL,
    `answeredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ArrivalNotice_messageKey_key`(`messageKey`),
    UNIQUE INDEX `ArrivalNotice_shipment_key`(`shipment`),
    UNIQUE INDEX `ArrivalNotice_subject_key`(`subject`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PreAlert` ADD CONSTRAINT `PreAlert_arrivalNoticeId_fkey` FOREIGN KEY (`arrivalNoticeId`) REFERENCES `ArrivalNotice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
