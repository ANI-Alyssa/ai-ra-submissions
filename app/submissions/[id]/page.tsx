import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviseForm } from "./ReviseForm";
import { MarkdownLite } from "@/app/components/MarkdownLite";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  AI_REVIEWING: { label: "AI Reviewing…", className: "bg-blue-100 text-blue-700" },
  NEEDS_REVISION: { label: "Needs Revision", className: "bg-amber-100 text-amber-800" },
  AI_APPROVED: { label: "AI Approved", className: "bg-teal/15 text-teal" },
  CLICKUP_FAILED: { label: "Approved — ClickUp Sync Failed", className: "bg-red-100 text-red-800" },
};

function parseList(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export default async function SubmissionPage({ params }: { params: { id: string } }) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
      reviews: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!submission) return notFound();

  const latestReview = submission.reviews[submission.reviews.length - 1];
  const statusMeta = STATUS_LABELS[submission.status] ?? STATUS_LABELS.DRAFT;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl text-navy">{submission.taskName}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Submitted by {submission.submittedBy} · {submission.department} · Version{" "}
          {submission.currentVersion}
        </p>
      </div>

      {latestReview && (
        <div className="rounded-lg border border-navy/15 bg-white p-5 shadow-md sm:p-6">
          <h2 className="font-serif text-lg text-navy">AI Review</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Score label="Overall" value={latestReview.overallScore} highlight />
            <Score label="Context" value={latestReview.contextScore} />
            <Score label="Decision Clarity" value={latestReview.decisionScore} />
            <Score label="Evidence" value={latestReview.evidenceScore} />
            <Score label="Recommendation" value={latestReview.recommendScore} />
            <Score label="Organization" value={latestReview.organizationScore} />
            <Score label="Readability" value={latestReview.readabilityScore} />
            <Score label="Confidence" value={latestReview.confidence} suffix="%" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
            <span>Risk: {latestReview.riskLevel}</span>
            <span>Est. review time: {latestReview.estimatedReviewSeconds}s</span>
            {latestReview.loomRequiredButMissing && (
              <span className="font-medium text-amber-700">A Loom walkthrough could strengthen this</span>
            )}
          </div>
          {submission.attachmentUrl && (
            <div className="mt-3 text-sm">
              <a
                href={submission.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-teal underline"
              >
                📎 {submission.attachmentName ?? "View attachment"}
              </a>
            </div>
          )}
        </div>
      )}

      {submission.status === "NEEDS_REVISION" && latestReview && (
        <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-md sm:p-6">
          <h2 className="font-serif text-lg text-amber-900">Why this needs revision</h2>
          <FeedbackList title="Reasons" items={parseList(latestReview.reasons)} />
          <FeedbackList title="Missing Information" items={parseList(latestReview.missingInformation)} />
          <FeedbackList title="Recommendations" items={parseList(latestReview.recommendations)} />
          <FeedbackList title="Review Tips" items={parseList(latestReview.reviewTips)} />
          {latestReview.suggestedRewrite && (
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Suggested Rewrite</h3>
              <div className="mt-1 rounded-md border-l-4 border-gold bg-white p-3 text-sm text-slate-800">
                <MarkdownLite text={latestReview.suggestedRewrite} />
              </div>
            </div>
          )}
        </div>
      )}

      {submission.status === "NEEDS_REVISION" && (
        <ReviseForm
          submissionId={submission.id}
          initialTaskName={submission.taskName}
          initialContext={submission.context}
          initialAssetsToReview={submission.assetsToReview}
          initialDecisionNeeded={submission.decisionNeeded}
          initialLoomLink={submission.loomLink}
          initialAttachmentUrl={submission.attachmentUrl}
          initialAttachmentName={submission.attachmentName}
        />
      )}

      {submission.status === "AI_APPROVED" && (
        <div className="rounded-lg border border-teal/30 bg-teal/10 p-5 shadow-md sm:p-6">
          <p className="font-medium text-navy">
            Approved — this is now on its way to Mae for review before Alyssa.
          </p>
          {submission.clickupTaskUrl ? (
            <a
              href={submission.clickupTaskUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-teal underline"
            >
              View ClickUp Task
            </a>
          ) : (
            <p className="mt-2 text-sm text-navy/70">
              ClickUp is not configured yet (dry-run mode) — no task was created. See
              .env.example.
            </p>
          )}
        </div>
      )}

      {submission.status === "CLICKUP_FAILED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          AI approved this submission, but creating the ClickUp task failed. Check server logs and
          ClickUp credentials, then retry.
        </div>
      )}
    </div>
  );
}

function Score({
  label,
  value,
  suffix = "",
  highlight = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md bg-cream p-3 text-center">
      <div className={`text-xl font-bold ${highlight ? "text-teal" : "text-navy"}`}>
        {value}
        {suffix}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-amber-900">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
