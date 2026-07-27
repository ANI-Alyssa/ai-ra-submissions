"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileIfPresent } from "@/lib/uploadClient";

interface ReviseFormProps {
  submissionId: string;
  initialTaskName: string;
  initialContext: string;
  initialAssetsToReview: string;
  initialDecisionNeeded: string;
  initialLoomLink: string | null;
  initialAttachmentUrl: string | null;
  initialAttachmentName: string | null;
}

export function ReviseForm({
  submissionId,
  initialTaskName,
  initialContext,
  initialAssetsToReview,
  initialDecisionNeeded,
  initialLoomLink,
  initialAttachmentUrl,
  initialAttachmentName,
}: ReviseFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const upload = await uploadFileIfPresent(form.get("attachmentFile"));

      const payload = {
        taskName: form.get("taskName"),
        context: form.get("context"),
        assetsToReview: form.get("assetsToReview"),
        decisionNeeded: form.get("decisionNeeded"),
        loomLink: form.get("loomLink"),
        attachmentUrl: upload?.url ?? null,
        attachmentName: upload?.fileName ?? null,
        freeformNotes: form.get("freeformNotes"),
      };

      const res = await fetch(`/api/submissions/${submissionId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Revision failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-navy/15 bg-white p-4">
      <h3 className="font-serif text-lg text-navy">Revise &amp; Resubmit</h3>

      <div>
        <label className="block text-sm font-medium text-navy">Task Name</label>
        <input
          name="taskName"
          defaultValue={initialTaskName}
          required
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Context</label>
        <textarea
          name="context"
          defaultValue={initialContext}
          required
          rows={2}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Decision Needed</label>
        <textarea
          name="decisionNeeded"
          defaultValue={initialDecisionNeeded}
          required
          rows={2}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Assets to Review</label>
        <textarea
          name="assetsToReview"
          defaultValue={initialAssetsToReview}
          required
          rows={3}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Loom Link</label>
        <input
          name="loomLink"
          type="url"
          defaultValue={initialLoomLink ?? ""}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">Attachment</label>
        {initialAttachmentName && (
          <p className="mt-1 text-xs text-slate-500">
            Current: <span className="font-medium text-navy">{initialAttachmentName}</span> —
            upload a new file to replace it, or leave blank to keep it.
          </p>
        )}
        <input
          name="attachmentFile"
          type="file"
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy/90"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">What changed (optional)</label>
        <textarea
          name="freeformNotes"
          rows={2}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-sm bg-teal px-5 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white hover:bg-teal/90 disabled:opacity-50"
      >
        {submitting ? "Running AI review…" : "Resubmit for AI Review"}
      </button>
    </form>
  );
}
