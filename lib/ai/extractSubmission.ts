import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionSystemPrompt, EXTRACTION_TOOL_SCHEMA } from "./extractionPrompt";

export interface ExtractedFields {
  taskName: string;
  department: string;
  context: string;
  decisionNeeded: string;
  assetsToReview: string;
  timeEstimate: string;
  dueDate: string;
  publishDate: string;
  missingFields: string[];
}

export async function extractSubmissionFields(description: string): Promise<ExtractedFields> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.AI_MODEL || "claude-sonnet-4-5";
  const todayIso = new Date().toISOString().slice(0, 10);

  const message = await client.messages.create({
    model,
    max_tokens: 1500,
    system: buildExtractionSystemPrompt(todayIso),
    tools: [EXTRACTION_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_SCHEMA.name },
    messages: [{ role: "user", content: description }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Extraction failed: model did not return structured fields.");
  }

  const raw = toolUse.input as Record<string, unknown>;

  return {
    taskName: String(raw.taskName ?? ""),
    department: String(raw.department ?? ""),
    context: String(raw.context ?? ""),
    decisionNeeded: String(raw.decisionNeeded ?? ""),
    assetsToReview: String(raw.assetsToReview ?? ""),
    timeEstimate: String(raw.timeEstimate ?? ""),
    dueDate: String(raw.dueDate ?? ""),
    publishDate: String(raw.publishDate ?? ""),
    missingFields: (raw.missingFields as string[]) ?? [],
  };
}
