-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CALLED', 'VISIT_SET', 'VISITED', 'PILOT', 'PAID', 'LOST');

-- CreateEnum
CREATE TYPE "LeadCity" AS ENUM ('FERGANA', 'ANDIJAN', 'NAMANGAN', 'OTHER');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" "LeadCity" NOT NULL,
    "shopName" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'construction',
    "message" TEXT,
    "source" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmCampaign" TEXT,
    "keyword" TEXT,
    "ref" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "lostReason" TEXT,
    "note" TEXT,
    "assignee" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_phone_createdAt_idx" ON "Lead"("phone", "createdAt");
