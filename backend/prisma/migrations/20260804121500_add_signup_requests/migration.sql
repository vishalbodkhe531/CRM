CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'APPROVED', 'REJECTED');

CREATE TABLE "SignupRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT NOT NULL,
    "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SignupRequest_status_createdAt_idx" ON "SignupRequest"("status", "createdAt" DESC);
CREATE INDEX "SignupRequest_email_idx" ON "SignupRequest"("email");
