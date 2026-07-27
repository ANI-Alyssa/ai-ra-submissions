-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submittedBy" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "timeEstimate" TEXT NOT NULL,
    "assetsToReview" TEXT NOT NULL,
    "decisionNeeded" TEXT NOT NULL,
    "publishDate" DATETIME,
    "department" TEXT NOT NULL,
    "loomLink" TEXT,
    "attachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "clickupTaskId" TEXT,
    "clickupTaskUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SubmissionVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "taskName" TEXT NOT NULL,
    "assetsToReview" TEXT NOT NULL,
    "decisionNeeded" TEXT NOT NULL,
    "loomLink" TEXT,
    "attachmentUrl" TEXT,
    "freeformNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "contextScore" INTEGER NOT NULL,
    "decisionScore" INTEGER NOT NULL,
    "evidenceScore" INTEGER NOT NULL,
    "recommendScore" INTEGER NOT NULL,
    "organizationScore" INTEGER NOT NULL,
    "readabilityScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "estimatedReviewSeconds" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "reasons" TEXT NOT NULL,
    "missingInformation" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "suggestedRewrite" TEXT,
    "reviewTips" TEXT NOT NULL,
    "loomRequiredButMissing" BOOLEAN NOT NULL DEFAULT false,
    "rawModelResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AIReview_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SubmissionVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
