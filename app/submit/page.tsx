"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileIfPresent } from "@/lib/uploadClient";
import { ThinkingIndicator } from "@/app/components/ThinkingIndicator";
import { MicButton } from "@/app/components/MicButton";

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

const MISSING_FIELD_PROMPTS: Record<string, string> = {
  taskName: "What should we call this request?",
  department: "Which department is this for?",
  context: "What happened, and why does Alyssa need to look at this?",
  decisionNeeded: "What decision do you need from Alyssa?",
  assetsToReview: "What should Alyssa look at (links, docs, etc.)?",
  timeEstimate: "About how long will this take Alyssa to review?",
  dueDate: "When do you need a decision by?",
};

interface FieldsState {
  submittedBy: string;
  taskName: string;
  dueDate: string;
  timeEstimate: string;
  department: (typeof DEPARTMENTS)[number];
  context: string;
  decisionNeeded: string;
  assetsToReview: string;
  loomLink: string;
  freeformNotes: string;
}

const EMPTY_FIELDS: FieldsState = {
  submittedBy: "",
  taskName: "",
  dueDate: "",
  timeEstimate: "",
  department: "MARKETING",
  context: "",
  decisionNeeded: "",
  assetsToReview: "",
  loomLink: "",
  freeformNotes: "",
};

export default function SubmitPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [fields, setFields] = useState<FieldsState>(EMPTY_FIELDS);
  // Fields the person has manually typed/selected into — "Fill Form with AI" should never
  // clobber something they already entered themselves, only fill in what's still blank.
  const [touchedFields, setTouchedFields] = useState<Set<keyof FieldsState>>(new Set());

  function setField<K extends keyof FieldsState>(name: K, value: FieldsState[K]) {
    setFields((prev) => ({ ...prev, [name]: value }));
    setTouchedFields((prev) => new Set(prev).add(name));
  }

  function appendField(name: keyof FieldsState, transcript: string) {
    setFields((prev) => ({
      ...prev,
      [name]: prev[name] ? `${prev[name]} ${transcript}` : transcript,
    }));
    setTouchedFields((prev) => new Set(prev).add(name));
  }

  async function handleExtract() {
    if (!description.trim()) return;
    setExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch("/api/extract-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Couldn't read that");
      }

      setFields((prev) => ({
        ...prev,
        submittedBy: touchedFields.has("submittedBy") ? prev.submittedBy : data.submittedBy || prev.submittedBy,
        taskName: touchedFields.has("taskName") ? prev.taskName : data.taskName || prev.taskName,
        department:
          touchedFields.has("department") || !(DEPARTMENTS as readonly string[]).includes(data.department)
            ? prev.department
            : data.department,
        context: touchedFields.has("context") ? prev.context : data.context || prev.context,
        decisionNeeded: touchedFields.has("decisionNeeded")
          ? prev.decisionNeeded
          : data.decisionNeeded || prev.decisionNeeded,
        assetsToReview: touchedFields.has("assetsToReview")
          ? prev.assetsToReview
          : data.assetsToReview || prev.assetsToReview,
        timeEstimate: touchedFields.has("timeEstimate")
          ? prev.timeEstimate
          : data.timeEstimate || prev.timeEstimate,
        dueDate: touchedFields.has("dueDate") ? prev.dueDate : data.dueDate || prev.dueDate,
      }));
      // Don't flag a field as missing if the person already filled it in themselves — the AI
      // extraction has no visibility into manual edits, only into the freeform description.
      setMissingFields((data.missingFields ?? []).filter((f: string) => !touchedFields.has(f as keyof FieldsState)));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const upload = await uploadFileIfPresent(form.get("attachmentFile"));

      const payload = {
        ...fields,
        attachmentUrl: upload?.url ?? null,
        attachmentName: upload?.fileName ?? null,
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
    <div className="rounded-md border border-navy/10 bg-white p-8 shadow-lg sm:p-10">
      <p className="font-sans text-xs uppercase tracking-widest text-gold">New Submission</p>
      <h1 className="mt-1 font-serif text-3xl text-navy">Tell Alyssa what you need</h1>
      <p className="mt-2 text-sm text-slate-600">
        AI will review this before it ever reaches Mae or Alyssa. Be specific — what do you need
        decided, and what should Alyssa look at to decide it?
      </p>

      <div className="mt-6 rounded-md border border-teal/30 bg-teal/5 p-5">
        <p className="text-sm font-semibold text-navy">Describe your request</p>
        <p className="mt-1 text-xs text-slate-600">
          Talk through the whole thing in one go — type it or use the mic — and AI will fill out
          the form below. You can still edit anything afterward.
        </p>
        <div className="mt-3 flex items-start gap-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder='e.g. "Marketing needs approval on the new Instagram carousel for the Q3 launch, opening August 4th..."'
            className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
          />
          <MicButton
            label="Describe by voice"
            onTranscript={(t) => setDescription((prev) => (prev ? `${prev} ${t}` : t))}
          />
        </div>
        {extractError && <p className="mt-2 text-sm text-red-600">{extractError}</p>}
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || !description.trim()}
          className="mt-3 flex items-center justify-center gap-2 rounded-sm bg-navy px-5 py-2.5 font-sans text-sm font-semibold uppercase tracking-wider text-white hover:bg-navy/90 disabled:opacity-50"
        >
          {extracting ? <ThinkingIndicator label="ANI is filling the form" /> : "Fill Form with AI"}
        </button>
      </div>

      {missingFields.length > 0 && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            A few things I couldn't find — type or use the mic on the highlighted fields below:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {missingFields.map((f) => (
              <li key={f}>{MISSING_FIELD_PROMPTS[f] ?? f}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field
          label="Submitted By"
          value={fields.submittedBy}
          onChange={(v) => setField("submittedBy", v)}
          required
        />
        <Field
          label="Task Name"
          value={fields.taskName}
          onChange={(v) => setField("taskName", v)}
          required
          mic
          onVoice={(t) => appendField("taskName", t)}
          flaggedPrompt={missingFields.includes("taskName") ? MISSING_FIELD_PROMPTS.taskName : undefined}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Due Date"
            type="date"
            value={fields.dueDate}
            onChange={(v) => setField("dueDate", v)}
            required
            flaggedPrompt={missingFields.includes("dueDate") ? MISSING_FIELD_PROMPTS.dueDate : undefined}
          />
          <Field
            label="Time Estimate"
            value={fields.timeEstimate}
            onChange={(v) => setField("timeEstimate", v)}
            placeholder="e.g. 15 minutes"
            required
            flaggedPrompt={
              missingFields.includes("timeEstimate") ? MISSING_FIELD_PROMPTS.timeEstimate : undefined
            }
          />
        </div>

        <div>
          <Label>Department</Label>
          {missingFields.includes("department") && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              🎙️ {MISSING_FIELD_PROMPTS.department}
            </p>
          )}
          <select
            value={fields.department}
            onChange={(e) => setField("department", e.target.value as FieldsState["department"])}
            required
            className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal ${
              missingFields.includes("department") ? "border-amber-400" : "border-navy/20 focus:border-teal"
            }`}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        <TextArea
          label="Context"
          value={fields.context}
          onChange={(v) => setField("context", v)}
          required
          placeholder="What happened? Why does it matter? Why does Alyssa specifically need to review this?"
          onVoice={(t) => appendField("context", t)}
          flaggedPrompt={missingFields.includes("context") ? MISSING_FIELD_PROMPTS.context : undefined}
        />

        <TextArea
          label="Decision Needed"
          value={fields.decisionNeeded}
          onChange={(v) => setField("decisionNeeded", v)}
          required
          placeholder='e.g. "Approve publishing the updated webinar registration page"'
          onVoice={(t) => appendField("decisionNeeded", t)}
          flaggedPrompt={
            missingFields.includes("decisionNeeded") ? MISSING_FIELD_PROMPTS.decisionNeeded : undefined
          }
        />

        <TextArea
          label="Assets to Review"
          value={fields.assetsToReview}
          onChange={(v) => setField("assetsToReview", v)}
          required
          placeholder="Links to docs, decks, dashboards, or a summary of what Alyssa needs to look at"
          onVoice={(t) => appendField("assetsToReview", t)}
          flaggedPrompt={
            missingFields.includes("assetsToReview") ? MISSING_FIELD_PROMPTS.assetsToReview : undefined
          }
        />

        <Field
          label="Loom Link"
          type="url"
          value={fields.loomLink}
          onChange={(v) => setField("loomLink", v)}
          placeholder="https://loom.com/share/..."
        />

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
          value={fields.freeformNotes}
          onChange={(v) => setField("freeformNotes", v)}
          placeholder="Anything else Alyssa or the AI reviewer should know"
          onVoice={(t) => appendField("freeformNotes", t)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-sm bg-teal px-5 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white hover:bg-teal/90 disabled:opacity-90"
        >
          {submitting ? <ThinkingIndicator /> : "Submit for Review"}
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
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  mic = false,
  onVoice,
  flaggedPrompt,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  mic?: boolean;
  onVoice?: (text: string) => void;
  flaggedPrompt?: string;
}) {
  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {flaggedPrompt && <p className="mt-1 text-xs font-medium text-amber-700">🎙️ {flaggedPrompt}</p>}
      <div className="mt-1 flex items-center gap-2">
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal ${
            flaggedPrompt ? "border-amber-400" : "border-navy/20 focus:border-teal"
          }`}
        />
        {mic && onVoice && <MicButton onTranscript={onVoice} />}
      </div>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  onVoice,
  flaggedPrompt,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  onVoice?: (text: string) => void;
  flaggedPrompt?: string;
}) {
  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {flaggedPrompt && <p className="mt-1 text-xs font-medium text-amber-700">🎙️ {flaggedPrompt}</p>}
      <div className="mt-1 flex items-start gap-2">
        <textarea
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal ${
            flaggedPrompt ? "border-amber-400" : "border-navy/20 focus:border-teal"
          }`}
        />
        {onVoice && <MicButton onTranscript={onVoice} />}
      </div>
    </div>
  );
}
