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
// assigned to Mae with status "submissions" — the actual status name configured on the "Mae
// Submissions" list (workspace 8507933 -> ANI EA space -> "R&A Guide Submissions (EA)" folder),
// not the PRD's "Submission" — ClickUp rejects a status that isn't one of the list's own. Carries
// the AI summary/score/confidence so Mae never has to re-derive context the submitter already gave.
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
  if (!assigneeId) {
    // Not fatal — ClickUp will just create the task unassigned — but Mae should always be the
    // assignee per the PRD's approval pipeline, so make the gap visible instead of silent.
    console.warn(
      "CLICKUP_MAE_ASSIGNEE_ID is not set — task will be created without an assignee."
    );
  }

  const customFieldMap = JSON.parse(process.env.CLICKUP_CUSTOM_FIELD_MAP || "{}") as Record<
    string,
    string
  >;

  // Only fields whose ClickUp type is a plain string/number/date are safe to send generically —
  // "ANI Department" and "Department" are drop_downs (need an option UUID, not the label text)
  // and "Submitted By" is a users field (needs a ClickUp user ID, not free text); mapping those
  // correctly would need option-ID/user-ID lookups this app doesn't do, so they're left out of
  // custom_fields and covered via the description instead (see buildTaskDescription).
  const customFields = Object.entries({
    "Decision Needed": input.decisionNeeded,
    "Assets to Review": input.assetsToReview,
    "Publish Date": input.publishDate ? new Date(input.publishDate).getTime() : null,
    "AI Score": review.overallScore,
    "AI Confidence": review.confidence,
    "Submission ID": submissionId,
  })
    .filter(([name, value]) => customFieldMap[name] && value !== null && value !== undefined)
    .map(([name, value]) => ({ id: customFieldMap[name], value }));

  const description = buildTaskDescription(input, review);
  const timeEstimateMs = parseTimeEstimateToMs(input.timeEstimate);

  const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.taskName,
      description,
      status: "submissions",
      assignees: assigneeId ? [Number(assigneeId)] : undefined,
      start_date: Date.now(),
      start_date_time: true,
      due_date: new Date(input.dueDate).getTime(),
      due_date_time: true,
      time_estimate: timeEstimateMs ?? undefined,
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

// Mirrors the header/emoji template Mae's team already uses when submitting tasks by hand
// (🧑 Submitted By / 🤖 Decision Needed / 📅 Publish Date / 📖 ANI Department), so an
// AI-approved submission lands looking like one of theirs — plus an AI Summary section appended
// underneath as the one thing a hand-written submission wouldn't already have.
function buildTaskDescription(input: SubmissionInput, review: AIReviewResult): string {
  const publishDate = input.publishDate ? input.publishDate.slice(0, 10) : "Not specified";

  return [
    `🧑 **Submitted By:**`,
    input.submittedBy,
    "",
    `🤖 **Decision Needed:**`,
    input.decisionNeeded,
    "",
    `📅 **Publish Date:**`,
    publishDate,
    "",
    `📖 **ANI Department:**`,
    input.department,
    "",
    "---",
    "",
    `**AI Summary** (score ${review.overallScore}/100, confidence ${review.confidence}%, risk ${review.riskLevel}, est. review time ${review.estimatedReviewSeconds}s)`,
    review.suggestedRewrite ?? input.assetsToReview,
    input.loomLink ? `\n**Loom:** ${input.loomLink}` : null,
    input.attachmentUrl
      ? `**Attachment:** [${input.attachmentName ?? "download"}](${resolveAttachmentUrl(input.attachmentUrl)})`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

const TIME_UNIT_MS: Record<string, number> = {
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
};

// Submitters type the Time Estimate field as free text ("15 minutes", "1h 30m", "2 hours") —
// ClickUp's native time_estimate field wants milliseconds. Returns null (field omitted, task
// still created) rather than throwing when the text doesn't match any known unit.
function parseTimeEstimateToMs(text: string): number | null {
  const regex = /(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m)\b/gi;
  let match: RegExpExecArray | null;
  let totalMs = 0;
  let matched = false;

  while ((match = regex.exec(text.toLowerCase())) !== null) {
    const unitMs = TIME_UNIT_MS[match[2]];
    if (unitMs) {
      totalMs += parseFloat(match[1]) * unitMs;
      matched = true;
    }
  }

  return matched ? Math.round(totalMs) : null;
}
