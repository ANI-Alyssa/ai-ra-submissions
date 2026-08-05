import type { AIReviewResult, SubmissionInput } from "../ai/types";

const DEPARTMENT_LABELS: Record<SubmissionInput["department"], string> = {
  MARKETING: "Marketing",
  PODCAST: "Podcast",
  OPERATIONS: "Operations",
  TECH: "Tech",
  PROGRAM: "Program",
  CONTENT: "Content",
  EA_SUPPORT: "EA",
};

const URGENT_WINDOW_DAYS = 3;

// Mirrors the "Tasks + Approvals" tracker's own two visible priority values — this app doesn't
// know their full priority scale, so it only ever picks between the two it can see in the sheet.
function computePriority(input: SubmissionInput): "High" | "Normal" {
  const daysUntil = (new Date(input.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  return daysUntil <= URGENT_WINDOW_DAYS ? "High" : "Normal";
}

function formatSheetDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

// The sheet's "Asset Link" column expects a single URL — submitters paste the doc/deck/Figma
// link inline in the free-text Assets to Review field rather than as a separate structured
// field, so this just grabs the first URL it finds there.
function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

export interface PushResult {
  skipped: boolean;
  ok?: boolean;
}

// Mirrors an AI-approved submission into Alyssa's existing "Tasks + Approvals" Google Sheet
// tracker via an Apps Script Web App webhook (see google-apps-script/Code.gs) — no Google Cloud
// credentials needed. Non-fatal by design: this is a supplementary view onto the same data
// already safely stored in ClickUp/our DB, so a failure here should never block an approval.
export async function pushToTasksSheet(
  input: SubmissionInput,
  review: AIReviewResult,
  clickupTaskUrl: string | null
): Promise<PushResult> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_SHARED_SECRET;

  if (!webhookUrl || !secret) {
    return { skipped: true };
  }

  const assetLink = extractFirstUrl(input.assetsToReview) ?? input.attachmentUrl ?? "";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      taskName: input.taskName,
      type: DEPARTMENT_LABELS[input.department],
      clickupLink: clickupTaskUrl ?? "",
      assetLink,
      loomLink: input.loomLink ?? "",
      projectStatus: "Ready for Alyssa",
      // The tracker's own column is still "Publish Date" — we no longer collect a separate
      // publish date, so this reuses Due Date, the closest thing we have.
      publishDate: formatSheetDate(input.dueDate),
      estimatedTime: input.timeEstimate,
      priority: computePriority(input),
      projectManager: "",
      notes: `AI score ${review.overallScore}/100`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Sheets webhook failed (${response.status}): ${body}`);
  }

  return { skipped: false, ok: true };
}
