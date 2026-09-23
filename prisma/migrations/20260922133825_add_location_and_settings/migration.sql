/*
  Warnings:

  - You are about to drop the column `latitude` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Attendance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "checkInAccuracy" DOUBLE PRECISION,
ADD COLUMN     "checkInDistance" DOUBLE PRECISION,
ADD COLUMN     "checkInLat" DOUBLE PRECISION,
ADD COLUMN     "checkInLng" DOUBLE PRECISION,
ADD COLUMN     "checkInLocationId" TEXT,
ADD COLUMN     "checkInSelfieUrl" TEXT,
ADD COLUMN     "checkOutAccuracy" DOUBLE PRECISION,
ADD COLUMN     "checkOutDistance" DOUBLE PRECISION,
ADD COLUMN     "checkOutLat" DOUBLE PRECISION,
ADD COLUMN     "checkOutLng" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedById" TEXT,
ALTER COLUMN "method" SET DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_category_idx" ON "Setting"("category");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_isActive_idx" ON "Setting"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_code_idx" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE INDEX "Location_isDefault_idx" ON "Location"("isDefault");

-- CreateIndex
CREATE INDEX "Attendance_checkInLocationId_idx" ON "Attendance"("checkInLocationId");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkInLocationId_fkey" FOREIGN KEY ("checkInLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
