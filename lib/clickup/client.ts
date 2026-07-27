import type { AIReviewResult, SubmissionInput } from "../ai/types";

export interface CreateTaskResult {
  dryRun: boolean;
  taskId: string | null;
  taskUrl: string | null;
}

interface ClickUpCreateTaskResponse {
  id: string;
  url: string;
}

// Auto ClickUp Integration (PRD §13): only AI-approved submissions reach ClickUp. Task is
// assigned to Mae with status "Submission" and carries the AI summary/score/confidence so she
// never has to re-derive context the submitter already gave.
export async function createClickUpTask(
  input: SubmissionInput,
  review: AIReviewResult,
  submissionId: string
): Promise<CreateTaskResult> {
  const token = process.env.CLICKUP_API_TOKEN;
  const listId = process.env.CLICKUP_LIST_ID;

  if (!token || !listId) {
    // Dry-run mode: lets the MVP loop be demoed/tested end-to-end before ClickUp credentials
    // and the target list/custom fields are provisioned.
    return { dryRun: true, taskId: null, taskUrl: null };
  }

  const assigneeId = process.env.CLICKUP_MAE_ASSIGNEE_ID;
  const customFieldMap = JSON.parse(process.env.CLICKUP_CUSTOM_FIELD_MAP || "{}") as Record<
    string,
    string
  >;

  const customFields = Object.entries({
    Department: input.department,
    "Decision Needed": input.decisionNeeded,
    "AI Score": review.overallScore,
    "AI Confidence": review.confidence,
    "Submission ID": submissionId,
  })
    .filter(([name]) => customFieldMap[name])
    .map(([name, value]) => ({ id: customFieldMap[name], value }));

  const description = buildTaskDescription(input, review);

  const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.taskName,
      description,
      status: "Submission",
      assignees: assigneeId ? [Number(assigneeId)] : undefined,
      due_date: new Date(input.dueDate).getTime(),
      custom_fields: customFields.length > 0 ? customFields : undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ClickUp task creation failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ClickUpCreateTaskResponse;
  return { dryRun: false, taskId: data.id, taskUrl: data.url };
}

// Uploaded attachments are stored as local "/uploads/..." paths (see lib/upload.ts) — they need
// APP_BASE_URL to become a link Mae/Alyssa can actually open from inside ClickUp. Once uploads
// move to real object storage this resolves to an already-absolute URL and becomes a no-op.
function resolveAttachmentUrl(attachmentUrl: string): string {
  if (/^https?:\/\//.test(attachmentUrl)) return attachmentUrl;
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}${attachmentUrl}` : attachmentUrl;
}

function buildTaskDescription(input: SubmissionInput, review: AIReviewResult): string {
  return [
    `**Decision Needed:** ${input.decisionNeeded}`,
    "",
    `**AI Summary** (score ${review.overallScore}/100, confidence ${review.confidence}%, risk ${review.riskLevel}, est. review time ${review.estimatedReviewSeconds}s)`,
    review.suggestedRewrite ?? input.assetsToReview,
    "",
    `**Submitted By:** ${input.submittedBy}`,
    `**Department:** ${input.department}`,
    input.loomLink ? `**Loom:** ${input.loomLink}` : null,
    input.attachmentUrl
      ? `**Attachment:** [${input.attachmentName ?? "download"}](${resolveAttachmentUrl(input.attachmentUrl)})`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
