import { DEPARTMENTS } from "../validation";

// Parses a rambling, spoken-style description (voice-to-text or typed) into the submission
// form's structured fields — the "one big voice note, AI fills the form" intake path. Separate
// from REVIEW_SYSTEM_PROMPT: this is extraction, not evaluation, and never rejects anything.
export function buildExtractionSystemPrompt(todayIso: string): string {
  return `You extract structured fields from a person's spoken-style description of a work
request, for a form they'd otherwise have to type field-by-field. The description may be
rambling, informal, or out of order — that's expected, it's transcribed speech or a quick typed
note, not polished writing.

Today's date is ${todayIso}. Resolve relative dates ("by Friday", "end of next week", "in two
days") against this date into YYYY-MM-DD. If no date is mentioned at all for a field, leave it as
an empty string — never invent one.

Extract:
- taskName: a short, specific title for the request (you may tighten the submitter's phrasing,
  but don't invent subject matter they didn't mention)
- department: best guess from ${DEPARTMENTS.join(", ")} based on what the request is about. Leave
  empty string if genuinely unclear from context.
- context: what happened / why it matters / why Alyssa needs to review it — pull this from
  whatever background the submitter gave, in their own substance (light cleanup for clarity is
  fine, don't add facts they didn't say)
- decisionNeeded: the specific action being requested (approve X, choose between A and B, etc.)
- assetsToReview: any links, documents, or description of what Alyssa should look at
- timeEstimate: how long the submitter expects the review to take, if they said so (e.g. "15
  minutes", "an hour") — leave empty string if not mentioned
- dueDate: YYYY-MM-DD if mentioned/inferable, else empty string
- publishDate: YYYY-MM-DD if mentioned, else empty string
- missingFields: which of taskName/department/context/decisionNeeded/assetsToReview/timeEstimate/
  dueDate you left empty or are genuinely unsure about, because the submitter didn't cover them.
  Use the exact field names listed above.

Do not fabricate specifics the submitter never said. An empty string plus a missingFields entry is
always better than a guessed-at value that isn't grounded in what they actually described.

Respond ONLY by calling the extract_submission_fields tool.`;
}

export const EXTRACTION_TOOL_SCHEMA = {
  name: "extract_submission_fields",
  description: "Submit the structured fields extracted from the submitter's description.",
  input_schema: {
    type: "object",
    properties: {
      taskName: { type: "string" },
      department: { type: "string", enum: [...DEPARTMENTS, ""] },
      context: { type: "string" },
      decisionNeeded: { type: "string" },
      assetsToReview: { type: "string" },
      timeEstimate: { type: "string" },
      dueDate: { type: "string" },
      publishDate: { type: "string" },
      missingFields: { type: "array", items: { type: "string" } },
    },
    required: [
      "taskName",
      "department",
      "context",
      "decisionNeeded",
      "assetsToReview",
      "timeEstimate",
      "dueDate",
      "publishDate",
      "missingFields",
    ],
  },
} as const;
