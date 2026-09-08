-- CreateTable
CREATE TABLE "RecruitmentIntent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clubId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "matchScore" INTEGER,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruitmentIntent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIRequestLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "useCase" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Club" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "contact" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "activityTime" TEXT NOT NULL DEFAULT '',
    "weeklyHours" INTEGER NOT NULL DEFAULT 0,
    "campus" TEXT NOT NULL DEFAULT '',
    "fee" INTEGER NOT NULL DEFAULT 0,
    "skillRequirement" TEXT NOT NULL DEFAULT 'beginner',
    "isRecruiting" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Club" ("category", "contact", "createdAt", "description", "id", "memberCount", "name", "requirements", "tags", "updatedAt") SELECT "category", "contact", "createdAt", "description", "id", "memberCount", "name", "requirements", "tags", "updatedAt" FROM "Club";
DROP TABLE "Club";
ALTER TABLE "new_Club" RENAME TO "Club";
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecruitmentIntent_createdAt_idx" ON "RecruitmentIntent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentIntent_clubId_sessionId_key" ON "RecruitmentIntent"("clubId", "sessionId");

-- CreateIndex
CREATE INDEX "AIRequestLog_createdAt_idx" ON "AIRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIRequestLog_useCase_status_idx" ON "AIRequestLog"("useCase", "status");
