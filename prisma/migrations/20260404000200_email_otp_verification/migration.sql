-- AlterTable
ALTER TABLE "User"
ADD COLUMN "emailVerifyOtpHash" TEXT,
ADD COLUMN "emailVerifyOtpExpiry" TIMESTAMP(3),
ADD COLUMN "emailVerifyOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "emailVerifyOtpLastSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_emailVerifyOtpExpiry_idx" ON "User"("emailVerifyOtpExpiry");
