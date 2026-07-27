import { prisma } from "./db";
import { getAIProvider } from "./ai/reviewEngine";
import { createClickUpTask } from "./clickup/client";
import type { SubmissionInput } from "./ai/types";
import type { SubmissionFormData, ReviseFormData } from "./validation";

function toSubmissionInput(
  base: {
    submittedBy: string;
    department: string;
    dueDate: Date;
    timeEstimate: string;
    publishDate: Date | null;
  },
  version: {
    taskName: string;
    assetsToReview: string;
    decisionNeeded: string;
    loomLink: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    freeformNotes: string | null;
  },
  priorReviews: SubmissionInput["priorReviews"]
): SubmissionInput {
  return {
    submittedBy: base.submittedBy,
    department: base.department as SubmissionInput["department"],
    dueDate: base.dueDate.toISOString(),
    timeEstimate: base.timeEstimate,
    publishDate: base.publishDate ? base.publishDate.toISOString() : null,
    taskName: version.taskName,
    assetsToReview: version.assetsToReview,
    decisionNeeded: version.decisionNeeded,
    loomLink: version.loomLink,
    attachmentUrl: version.attachmentUrl,
    attachmentName: version.attachmentName,
    freeformNotes: version.freeformNotes,
    priorReviews,
  };
}

async function runReviewAndMaybeCreateTask(
  submissionId: string,
  versionId: string,
  aiInput: SubmissionInput
) {
  const provider = getAIProvider();
  const result = await provider.reviewSubmission(aiInput);

  await prisma.aIReview.create({
    data: {
      submissionId,
      versionId,
      contextScore: result.contextScore,
      decisionScore: result.decisionScore,
      evidenceScore: result.evidenceScore,
      recommendScore: result.recommendScore,
      organizationScore: result.organizationScore,
      readabilityScore: result.readabilityScore,
      overallScore: result.overallScore,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      estimatedReviewSeconds: result.estimatedReviewSeconds,
      approved: result.approved,
      reasons: JSON.stringify(result.reasons),
      missingInformation: JSON.stringify(result.missingInformation),
      recommendations: JSON.stringify(result.recommendations),
      suggestedRewrite: result.suggestedRewrite,
      reviewTips: JSON.stringify(result.reviewTips),
      loomRequiredButMissing: result.loomRequiredButMissing,
      rawModelResponse: result.rawModelResponse,
    },
  });

  if (!result.approved) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "NEEDS_REVISION" },
    });
    return;
  }

  try {
    const clickupResult = await createClickUpTask(aiInput, result, submissionId);
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "AI_APPROVED",
        clickupTaskId: clickupResult.taskId,
        clickupTaskUrl: clickupResult.taskUrl,
      },
    });
  } catch (err) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "CLICKUP_FAILED" },
    });
    throw err;
  }
}

export async function createSubmission(data: SubmissionFormData) {
  const submission = await prisma.submission.create({
    data: {
      submittedBy: data.submittedBy,
      taskName: data.taskName,
      dueDate: new Date(data.dueDate),
      timeEstimate: data.timeEstimate,
      assetsToReview: data.assetsToReview,
      decisionNeeded: data.decisionNeeded,
      publishDate: data.publishDate ? new Date(data.publishDate) : null,
      department: data.department,
      loomLink: data.loomLink,
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
      status: "AI_REVIEWING",
      currentVersion: 1,
      versions: {
        create: {
          versionNumber: 1,
          taskName: data.taskName,
          assetsToReview: data.assetsToReview,
          decisionNeeded: data.decisionNeeded,
          loomLink: data.loomLink,
          attachmentUrl: data.attachmentUrl,
          attachmentName: data.attachmentName,
          freeformNotes: data.freeformNotes,
        },
      },
    },
    include: { versions: true },
  });

  const version = submission.versions[0];
  const aiInput = toSubmissionInput(submission, version, []);

  await runReviewAndMaybeCreateTask(submission.id, version.id, aiInput);

  return submission.id;
}

export async function reviseSubmission(submissionId: string, data: ReviseFormData) {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { reviews: { orderBy: { createdAt: "asc" }, include: { version: true } } },
  });

  const nextVersionNumber = submission.currentVersion + 1;

  // A blank attachment in the revise form means "keep what's already there", not "remove it" —
  // the file input can't be pre-filled with the previous file, so nothing selected must not wipe it.
  const attachmentUrl = data.attachmentUrl ?? submission.attachmentUrl;
  const attachmentName = data.attachmentUrl ? data.attachmentName : submission.attachmentName;

  const version = await prisma.submissionVersion.create({
    data: {
      submissionId,
      versionNumber: nextVersionNumber,
      taskName: data.taskName,
      assetsToReview: data.assetsToReview,
      decisionNeeded: data.decisionNeeded,
      loomLink: data.loomLink,
      attachmentUrl,
      attachmentName,
      freeformNotes: data.freeformNotes,
    },
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      taskName: data.taskName,
      assetsToReview: data.assetsToReview,
      decisionNeeded: data.decisionNeeded,
      loomLink: data.loomLink,
      attachmentUrl,
      attachmentName,
      currentVersion: nextVersionNumber,
      status: "AI_REVIEWING",
    },
  });

  const priorReviews = submission.reviews.map((r) => ({
    versionNumber: r.version.versionNumber,
    overallScore: r.overallScore,
    reasons: JSON.parse(r.reasons) as string[],
    missingInformation: JSON.parse(r.missingInformation) as string[],
  }));

  const aiInput = toSubmissionInput(submission, version, priorReviews);

  await runReviewAndMaybeCreateTask(submissionId, version.id, aiInput);

  return submissionId;
}
