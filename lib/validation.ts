import { z } from "zod";

export const DEPARTMENTS = [
  "MARKETING",
  "PODCAST",
  "OPERATIONS",
  "TECH",
  "PROGRAM",
  "CONTENT",
  "EA_SUPPORT",
] as const;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

export const submissionInputSchema = z.object({
  submittedBy: z.string().min(1, "Required"),
  taskName: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
  timeEstimate: z.string().min(1, "Required"),
  assetsToReview: z.string().min(1, "Required"),
  decisionNeeded: z.string().min(1, "Required"),
  publishDate: z.preprocess(emptyToNull, z.string().nullable()),
  department: z.enum(DEPARTMENTS),
  loomLink: z.preprocess(emptyToNull, z.string().url().nullable()),
  // Set programmatically from the /api/uploads response (a local "/uploads/..." path), not
  // typed by the user, so it isn't a full URL — just a non-empty string.
  attachmentUrl: z.preprocess(emptyToNull, z.string().nullable()),
  attachmentName: z.preprocess(emptyToNull, z.string().nullable()),
  freeformNotes: z.preprocess(emptyToNull, z.string().nullable()),
});

export type SubmissionFormData = z.infer<typeof submissionInputSchema>;

export const reviseInputSchema = submissionInputSchema.pick({
  taskName: true,
  assetsToReview: true,
  decisionNeeded: true,
  loomLink: true,
  attachmentUrl: true,
  attachmentName: true,
  freeformNotes: true,
});

export type ReviseFormData = z.infer<typeof reviseInputSchema>;
