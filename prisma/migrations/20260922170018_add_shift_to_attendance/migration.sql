-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "shiftId" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE INDEX "Attendance_shiftId_idx" ON "Attendance"("shiftId");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
