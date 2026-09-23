/*
  Warnings:

  - A unique constraint covering the columns `[userId,workDate]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workDate` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "checkInIpAddress" TEXT,
ADD COLUMN     "checkOutIpAddress" TEXT,
ADD COLUMN     "checkOutSelfieUrl" TEXT,
ADD COLUMN     "correctedAt" TIMESTAMP(3),
ADD COLUMN     "correctedById" TEXT,
ADD COLUMN     "correctionNote" TEXT,
ADD COLUMN     "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isCorrected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'HADIR',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "workDate" DATE NOT NULL,
ADD COLUMN     "workDurationMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'OFFICE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultLocationId" TEXT;

-- CreateIndex
CREATE INDEX "Attendance_workDate_idx" ON "Attendance"("workDate");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_userId_status_idx" ON "Attendance"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_workDate_key" ON "Attendance"("userId", "workDate");

-- CreateIndex
CREATE INDEX "Location_type_idx" ON "Location"("type");

-- CreateIndex
CREATE INDEX "User_defaultLocationId_idx" ON "User"("defaultLocationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
