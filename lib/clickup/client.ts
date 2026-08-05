import type { AIReviewResult, SubmissionInput } from "../ai/types";

// The description previously showed the raw enum ("CONTENT", "EA_SUPPORT") instead of a readable
// label — confusing to read and easy to mistake for garbled/duplicated text.
const DEPARTMENT_LABELS: Record<SubmissionInput["department"], string> = {
  MARKETING: "Marketing",
  PODCAST: "Podcast",
  OPERATIONS: "Operations",
  TECH: "Tech",
  PROGRAM: "Program",
  CONTENT: "Content",
  EA_SUPPORT: "EA Support",
};

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

  // Text/number/date fields are safe to send generically as {id, value}. "ANI Department" is a
  // drop_down (needs the option's UUID, not the label text) and "Submitted By" is a users field
  // (needs a ClickUp user ID, not free text) — both resolved separately below since they need a
  // lookup rather than a straight value pass-through.
  const customFields: Array<{ id: string; value: unknown }> = Object.entries({
    Context: input.context,
    "Decision Needed": input.decisionNeeded,
    "Assets to Review": input.assetsToReview,
    "Loom link (optional)": input.loomLink,
    "AI Score": review.overallScore,
    "AI Confidence": review.confidence,
    "Submission ID": submissionId,
  })
    .filter(([name, value]) => customFieldMap[name] && value !== null && value !== undefined)
    .map(([name, value]) => ({ id: customFieldMap[name], value }));

  const departmentField = resolveDepartmentField(input.department);
  if (departmentField) customFields.push(departmentField);

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
      // ClickUp's plain "description" field renders markdown syntax as literal asterisks —
      // "markdown_description" is the field that actually gets parsed into rich text/bold.
      markdown_description: description,
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

  // "users"-type custom fields aren't settable through the generic custom_fields array on task
  // create (ClickUp silently ignores it — confirmed empirically) — they need this dedicated
  // endpoint. Non-fatal: the task already exists and the description already has the name, so a
  // failure here shouldn't fail the whole approval.
  const submittedByUserId = resolveSubmittedByUserId(input.submittedBy);
  if (submittedByUserId) {
    try {
      await setUsersField(token, data.id, submittedByUserId);
    } catch (err) {
      console.warn("Failed to set ClickUp 'Submitted By' field (non-fatal):", err);
    }
  }

  return { dryRun: false, taskId: data.id, taskUrl: data.url };
}

async function setUsersField(token: string, taskId: string, userId: number): Promise<void> {
  const fieldId = process.env.CLICKUP_SUBMITTED_BY_FIELD_ID;
  if (!fieldId) return;

  const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: { add: [userId], rem: [] } }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Setting 'Submitted By' field failed (${response.status}): ${body}`);
  }
}

// Resolves our department enum to the "🏢 ANI Department" drop_down's option UUID on the real
// "Mae Submissions" list. Both the field ID and the option-ID map are workspace-specific (list
// 901703878273), configured via env rather than hardcoded so they survive a list rebuild.
function resolveDepartmentField(department: SubmissionInput["department"]): { id: string; value: string } | null {
  const fieldId = process.env.CLICKUP_DEPARTMENT_FIELD_ID;
  if (!fieldId) return null;

  const optionMap = JSON.parse(process.env.CLICKUP_DEPARTMENT_OPTIONS || "{}") as Record<
    string,
    string
  >;
  const optionId = optionMap[department];
  if (!optionId) return null;

  return { id: fieldId, value: optionId };
}

// Resolves a submitter's typed name to the "🧑🏽‍🦰 Submitted By" users field's ClickUp user ID,
// matching case-insensitively on first name (submitters type free text, not a ClickUp mention) —
// e.g. "Mae" or "mae silorio" both match the "mae" entry. Returns null (description text still
// has the name) rather than guessing when there's no confident match, since assigning the wrong
// person to a "users" field is worse than leaving it blank.
function resolveSubmittedByUserId(submittedBy: string): number | null {
  const userMap = JSON.parse(process.env.CLICKUP_SUBMITTER_USER_IDS || "{}") as Record<
    string,
    number
  >;
  const firstName = submittedBy.trim().split(/\s+/)[0]?.toLowerCase();
  return (firstName ? userMap[firstName] : undefined) ?? null;
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
// (🧑 Submitted By / 🤖 Decision Needed / 📖 ANI Department), so an AI-approved submission lands
// looking like one of theirs — plus an AI Summary section appended underneath as the one thing a
// hand-written submission wouldn't already have. Attachment is folded into Assets to Review
// (right after the link/notes) rather than left dangling near the bottom.
function buildTaskDescription(input: SubmissionInput, review: AIReviewResult): string {
  return [
    `🧑 **Submitted By:**`,
    input.submittedBy,
    "",
    `📋 **Context:**`,
    input.context,
    "",
    `🎨 **Assets to Review:**`,
    input.assetsToReview,
    input.attachmentUrl
      ? `Attachment: [${input.attachmentName ?? "download"}](${resolveAttachmentUrl(input.attachmentUrl)})`
      : null,
    "",
    `🤖 **Decision Needed:**`,
    input.decisionNeeded,
    "",
    `📖 **ANI Department:**`,
    DEPARTMENT_LABELS[input.department],
    "",
    // Not a literal "---" horizontal-rule line here on purpose — a text line immediately
    // followed by one (even across a blank line, in ClickUp's markdown parser) gets misread as
    // a setext heading, which is why "ANI Department"'s value was rendering as a giant heading.
    `**AI Summary** (score ${review.overallScore}/100, confidence ${review.confidence}%, risk ${review.riskLevel}, est. review time ${review.estimatedReviewSeconds}s)`,
    review.suggestedRewrite,
    input.loomLink ? `\n**Loom:** ${input.loomLink}` : null,
  ]
    .filter((line): line is string => line !== null && line !== "")
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
