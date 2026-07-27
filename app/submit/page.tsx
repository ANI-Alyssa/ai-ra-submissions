"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileIfPresent } from "@/lib/uploadClient";

const DEPARTMENTS = [
  "MARKETING",
  "PODCAST",
  "OPERATIONS",
  "TECH",
  "PROGRAM",
  "CONTENT",
  "EA_SUPPORT",
] as const;

const DEPARTMENT_LABELS: Record<(typeof DEPARTMENTS)[number], string> = {
  MARKETING: "Marketing",
  PODCAST: "Podcast",
  OPERATIONS: "Operations",
  TECH: "Tech",
  PROGRAM: "Program",
  CONTENT: "Content",
  EA_SUPPORT: "EA Support",
};

export default function SubmitPage() {
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
        submittedBy: form.get("submittedBy"),
        taskName: form.get("taskName"),
        dueDate: form.get("dueDate"),
        timeEstimate: form.get("timeEstimate"),
        assetsToReview: form.get("assetsToReview"),
        decisionNeeded: form.get("decisionNeeded"),
        publishDate: form.get("publishDate"),
        department: form.get("department"),
        loomLink: form.get("loomLink"),
        attachmentUrl: upload?.url ?? null,
        attachmentName: upload?.fileName ?? null,
        freeformNotes: form.get("freeformNotes"),
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Submission failed");
      }
      router.push(`/submissions/${data.submissionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-widest text-gold">New Submission</p>
      <h1 className="mt-1 font-serif text-3xl text-navy">Tell Alyssa what you need</h1>
      <p className="mt-2 text-sm text-slate-600">
        AI will review this before it ever reaches Mae or Alyssa. Be specific — what do you need
        decided, and what should Alyssa look at to decide it?
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Submitted By" name="submittedBy" required />
        <Field label="Task Name" name="taskName" required />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Due Date" name="dueDate" type="date" required />
          <Field label="Time Estimate" name="timeEstimate" placeholder="e.g. 15 minutes" required />
        </div>

        <div>
          <Label>Department</Label>
          <select
            name="department"
            required
            className="mt-1 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        <TextArea
          label="Decision Needed"
          name="decisionNeeded"
          required
          placeholder='e.g. "Approve publishing the updated webinar registration page"'
        />

        <TextArea
          label="Assets to Review"
          name="assetsToReview"
          required
          placeholder="Links to docs, decks, dashboards, or a summary of what Alyssa needs to look at"
        />

        <Field label="Publish Date" name="publishDate" type="date" />
        <Field label="Loom Link" name="loomLink" type="url" placeholder="https://loom.com/share/..." />

        <div>
          <Label>Attachment</Label>
          <input
            name="attachmentFile"
            type="file"
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy/90"
          />
        </div>

        <TextArea
          label="Additional Notes (optional)"
          name="freeformNotes"
          placeholder="Anything else Alyssa or the AI reviewer should know"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-teal px-5 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white hover:bg-teal/90 disabled:opacity-50"
        >
          {submitting ? "Running AI review…" : "Submit for Review"}
        </button>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-navy">{children}</label>;
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
      />
    </div>
  );
}
