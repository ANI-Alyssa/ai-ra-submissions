import { DEPARTMENTS } from "../validation";

// Parses a rambling, spoken-style description (voice-to-text or typed) into the submission
// form's structured fields — the "one big voice note, AI fills the form" intake path. Separate
// from REVIEW_SYSTEM_PROMPT: this is extraction, not evaluation, and never rejects anything.
export function buildExtractionSystemPrompt(todayIso: string): string {
  return `You extract structured fields from a person's spoken-style description of a work
request, for a form they'd otherwise have to type field-by-field. The description may be
rambling, informal, or out of order — that's expected, it's transcribed speech or a quick typed
note, not polished writing. Speech-to-text transcripts especially can contain false starts,
filler words, or a phrase repeated back-to-back ("into, into her social") — treat these as
transcription noise, not meaningful content, and don't let them distract you from what's actually
being said.

EXPLICIT STATEMENTS WIN — if the submitter directly states a field's value ("task name is X",
"department is Y", "submitted by Z", "this is for operations"), use that stated value verbatim.
Do not re-derive or second-guess an explicitly labeled value from surrounding context, and do not
let messy phrasing elsewhere in the transcript cause you to miss or override it. An explicit
statement of a field is the strongest possible signal for that field — treat it as fact, not as
one input among several to weigh.

Today's date is ${todayIso}. Resolve relative dates ("by Friday", "end of next week", "in two
days") against this date into YYYY-MM-DD. If no date is mentioned at all for a field, leave it as
an empty string — never invent one.

Extract:
- submittedBy: the submitter's name, if they say who they are or who this is submitted by (e.g.
  "this is submitted by Madina", "I'm Mae and..."). Leave empty string if not stated — never guess
  a name that wasn't said.
- taskName: a short, specific title for the request. If the submitter explicitly states a task
  name, use it verbatim rather than rewriting it. Otherwise you may tighten their phrasing, but
  don't invent subject matter they didn't mention.
- department: best guess from ${DEPARTMENTS.join(", ")} based on what the request is about, or the
  exact department the submitter explicitly names. Leave empty string if genuinely unclear.
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
  Use the exact field names listed above. Never include submittedBy here — that field is always
  optional to fill in manually.

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
      submittedBy: { type: "string" },
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
      "submittedBy",
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
