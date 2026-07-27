import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIReviewResult, SubmissionInput } from "./types";
import { REVIEW_SYSTEM_PROMPT, REVIEW_TOOL_SCHEMA, buildReviewUserPrompt } from "./prompt";

const APPROVAL_THRESHOLD = Number(process.env.AI_APPROVAL_THRESHOLD ?? "80");

export class AnthropicReviewProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env before running AI review (see .env.example)."
      );
    }
    this.client = new Anthropic({ apiKey });
    this.model = process.env.AI_MODEL || "claude-sonnet-4-5";
  }

  async reviewSubmission(input: SubmissionInput): Promise<AIReviewResult> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: REVIEW_SYSTEM_PROMPT,
      tools: [REVIEW_TOOL_SCHEMA],
      tool_choice: { type: "tool", name: REVIEW_TOOL_SCHEMA.name },
      messages: [{ role: "user", content: buildReviewUserPrompt(input) }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("AI review failed: model did not return a structured review.");
    }

    const raw = toolUse.input as Record<string, unknown>;

    const contextScore = Number(raw.contextScore);
    const decisionScore = Number(raw.decisionScore);
    const evidenceScore = Number(raw.evidenceScore);
    const recommendScore = Number(raw.recommendScore);
    const organizationScore = Number(raw.organizationScore);
    const readabilityScore = Number(raw.readabilityScore);
    const overallScore = Number(raw.overallScore);
    const loomRequiredButMissing = Boolean(raw.loomRequiredButMissing);

    // Confidence means "how confident that Alyssa has what she needs", which should never diverge
    // far from overallScore — models sometimes misread it as "confidence in my own critique"
    // instead (a submission that's obviously bad can score high on that reading). Clamped here as
    // a safety net regardless of how well the prompt wording holds up over time.
    const confidence = Math.min(Number(raw.confidence), Math.min(100, overallScore + 20));

    // The model proposes scores; the platform — not the model — owns the approval bar, so the
    // threshold stays configurable (env today, Admin Panel in a later phase) without a prompt edit.
    const approved =
      !loomRequiredButMissing &&
      overallScore >= APPROVAL_THRESHOLD &&
      contextScore >= APPROVAL_THRESHOLD &&
      decisionScore >= APPROVAL_THRESHOLD &&
      evidenceScore >= APPROVAL_THRESHOLD;

    return {
      contextScore,
      decisionScore,
      evidenceScore,
      recommendScore,
      organizationScore,
      readabilityScore,
      overallScore,
      confidence,
      approved,
      riskLevel: (raw.riskLevel as AIReviewResult["riskLevel"]) ?? "medium",
      estimatedReviewSeconds: Number(raw.estimatedReviewSeconds) || 60,
      reasons: (raw.reasons as string[]) ?? [],
      missingInformation: (raw.missingInformation as string[]) ?? [],
      recommendations: (raw.recommendations as string[]) ?? [],
      suggestedRewrite: (raw.suggestedRewrite as string) ?? null,
      reviewTips: (raw.reviewTips as string[]) ?? [],
      loomRequiredButMissing,
      rawModelResponse: JSON.stringify(raw),
    };
  }
}
