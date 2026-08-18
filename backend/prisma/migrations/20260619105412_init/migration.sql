-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('GOODS', 'SERVICE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('COLD_CALL', 'EMAIL', 'REFERENCE', 'SOCIAL_MEDIA', 'WEBSITE', 'ADVERTISE', 'GOOGLE_ADS', 'EVENT', 'TRADE_SHOW', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('IT', 'BANKING', 'EDUCATION', 'MANUFACTURING', 'HEALTHCARE', 'REAL_ESTATE', 'RETAIL', 'ECOMMERCE', 'AUTOMOBILE', 'CONSTRUCTION', 'TRAVEL_TOURISM', 'MEDIA_ENTERTAINMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('NEW', 'EXISTING');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ATTEMPTED_CONTACT', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('REQUIREMENT', 'FOLLOW_UP', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ProspectActivityType" AS ENUM ('CONVERSION', 'STAGE_CHANGE', 'CALL', 'MEETING', 'EMAIL', 'FOLLOW_UP_SET', 'QUOTATION_CREATED', 'QUOTATION_UPDATED');

-- CreateEnum
CREATE TYPE "ProspectFollowUpType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'SITE_VISIT');

-- CreateEnum
CREATE TYPE "ProspectReminder" AS ENUM ('MINUTES_15', 'MINUTES_30', 'HOUR_1', 'DAY_1');

-- CreateEnum
CREATE TYPE "FollowUpHealth" AS ENUM ('DONE', 'OK', 'WARNING', 'OVERDUE', 'NONE');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemCode" TEXT,
    "itemType" "ItemType" NOT NULL,
    "hsnCode" TEXT,
    "sacCode" TEXT,
    "description" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profilePicture" TEXT,
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "linkedInProfile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "source" "LeadSource",
    "industry" "Industry",
    "leadType" "LeadType",
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "productInterestId" TEXT,
    "requiredDescription" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "convertedAt" TIMESTAMP(3),
    "convertedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSequence" (
    "organizationId" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadSequence_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "authorizedPerson" TEXT,
    "orgType" TEXT,
    "mobile" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "dateOfRegistration" TIMESTAMP(3),
    "email" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "prospectNo" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "stage" "ProspectStage" NOT NULL DEFAULT 'REQUIREMENT',
    "expectedValue" DOUBLE PRECISION,
    "closeDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "followUpTime" TEXT,
    "followUpType" "ProspectFollowUpType",
    "followUpNotes" TEXT,
    "followUpReminder" "ProspectReminder",
    "followUpAssignedToId" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectActivity" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" "ProspectActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "metadata" JSONB,
    "followUpHealth" "FollowUpHealth",
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSequence" (
    "organizationId" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectSequence_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationNo" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'PENDING',
    "details" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tdsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "organizationId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "prospectId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationSequence" (
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationSequence_pkey" PRIMARY KEY ("organizationId","year")
);

-- CreateTable
CREATE TABLE "QuotationStatusHistory" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "fromStatus" "QuotationStatus",
    "toStatus" "QuotationStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "replacedAt" TIMESTAMP(3),
    "isUsedAfterRotation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "mobile" TEXT,
    "profileImage" TEXT,
    "employeeId" TEXT,
    "designation" TEXT,
    "joiningDate" TIMESTAMP(3),
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT,
    "managerId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSequence" (
    "organizationId" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSequence_pkey" PRIMARY KEY ("organizationId")
);

-- CreateIndex
CREATE INDEX "Item_itemCode_idx" ON "Item"("itemCode");

-- CreateIndex
CREATE INDEX "Item_organizationId_idx" ON "Item"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadNo_key" ON "Lead"("leadNo");

-- CreateIndex
CREATE INDEX "Lead_leadNo_idx" ON "Lead"("leadNo");

-- CreateIndex
CREATE INDEX "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_status_assignedToId_createdAt_idx" ON "Lead"("organizationId", "status", "assignedToId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_prefix_key" ON "Organization"("prefix");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_prefix_idx" ON "Organization"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_prospectNo_key" ON "Prospect"("prospectNo");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_leadId_key" ON "Prospect"("leadId");

-- CreateIndex
CREATE INDEX "Prospect_prospectNo_idx" ON "Prospect"("prospectNo");

-- CreateIndex
CREATE INDEX "Prospect_stage_idx" ON "Prospect"("stage");

-- CreateIndex
CREATE INDEX "Prospect_assignedToId_idx" ON "Prospect"("assignedToId");

-- CreateIndex
CREATE INDEX "Prospect_followUpAssignedToId_idx" ON "Prospect"("followUpAssignedToId");

-- CreateIndex
CREATE INDEX "Prospect_followUpDate_idx" ON "Prospect"("followUpDate");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_idx" ON "Prospect"("organizationId");

-- CreateIndex
CREATE INDEX "ProspectActivity_prospectId_createdAt_idx" ON "ProspectActivity"("prospectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProspectActivity_createdById_idx" ON "ProspectActivity"("createdById");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_deletedAt_createdAt_idx" ON "Quotation"("organizationId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_status_date_idx" ON "Quotation"("organizationId", "status", "date");

-- CreateIndex
CREATE INDEX "Quotation_organizationId_assignedToId_deletedAt_idx" ON "Quotation"("organizationId", "assignedToId", "deletedAt");

-- CreateIndex
CREATE INDEX "Quotation_prospectId_idx" ON "Quotation"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_organizationId_quotationNo_key" ON "Quotation"("organizationId", "quotationNo");

-- CreateIndex
CREATE INDEX "QuotationStatusHistory_quotationId_changedAt_idx" ON "QuotationStatusHistory"("quotationId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "QuotationStatusHistory_changedById_idx" ON "QuotationStatusHistory"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_productInterestId_fkey" FOREIGN KEY ("productInterestId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedById_fkey" FOREIGN KEY ("convertedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSequence" ADD CONSTRAINT "LeadSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_followUpAssignedToId_fkey" FOREIGN KEY ("followUpAssignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectActivity" ADD CONSTRAINT "ProspectActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectActivity" ADD CONSTRAINT "ProspectActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectSequence" ADD CONSTRAINT "ProspectSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationSequence" ADD CONSTRAINT "QuotationSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationStatusHistory" ADD CONSTRAINT "QuotationStatusHistory_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationStatusHistory" ADD CONSTRAINT "QuotationStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSequence" ADD CONSTRAINT "UserSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
