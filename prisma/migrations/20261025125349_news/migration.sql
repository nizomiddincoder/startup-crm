-- AlterTable
ALTER TABLE "User" ADD COLUMN     "newsSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image" BYTEA,
    "imageMime" TEXT,
    "onSite" BOOLEAN NOT NULL DEFAULT true,
    "onApp" BOOLEAN NOT NULL DEFAULT true,
    "toChannel" BOOLEAN NOT NULL DEFAULT true,
    "toOwners" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "channelSentAt" TIMESTAMP(3),
    "ownersSentAt" TIMESTAMP(3),
    "ownersSentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsPost_publishedAt_idx" ON "NewsPost"("publishedAt");
