import type { AIProvider } from "./types";
import { AnthropicReviewProvider } from "./anthropicProvider";

// Modular AI provider architecture (PRD §22): swapping models/vendors is a config change here,
// not a rewrite of the review logic. Add new providers (OpenAI, Gemini, ...) as they're needed —
// each just implements AIProvider.reviewSubmission().
export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "anthropic";

  switch (providerName) {
    case "anthropic":
      return new AnthropicReviewProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${providerName}". Only "anthropic" is implemented today.`
      );
  }
}
