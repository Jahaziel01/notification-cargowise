/*
  Warnings:

  - A unique constraint covering the columns `[arrivalNoticeId]` on the table `ArrivalResponse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[arrivalNoticeId]` on the table `PreAlert` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `ArrivalResponse_arrivalNoticeId_key` ON `ArrivalResponse`(`arrivalNoticeId`);

-- CreateIndex
CREATE UNIQUE INDEX `PreAlert_arrivalNoticeId_key` ON `PreAlert`(`arrivalNoticeId`);
