/*
  Warnings:

  - You are about to drop the column `cc` on the `arrivalnotice` table. All the data in the column will be lost.
  - You are about to drop the column `recipients` on the `arrivalnotice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `arrivalnotice` DROP COLUMN `cc`,
    DROP COLUMN `recipients`;

-- CreateTable
CREATE TABLE `ArrivalResponse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `responseA` BOOLEAN NOT NULL DEFAULT false,
    `responseB` BOOLEAN NOT NULL DEFAULT false,
    `send` BOOLEAN NOT NULL DEFAULT false,
    `closed` BOOLEAN NOT NULL DEFAULT false,
    `json` JSON NULL,
    `arrivalNoticeId` INTEGER NULL,
    `responseAAt` DATETIME(3) NULL,
    `responseBAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArrivalResponse` ADD CONSTRAINT `ArrivalResponse_arrivalNoticeId_fkey` FOREIGN KEY (`arrivalNoticeId`) REFERENCES `ArrivalNotice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
