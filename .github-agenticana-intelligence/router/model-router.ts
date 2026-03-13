/**
 * model-router.ts — Complexity-based model tier selection for Agenticana.
 *
 * Scores task complexity on a 0–100 scale and maps to the cheapest adequate
 * model tier. This keeps twenty agents economically feasible by routing simple
 * tasks to Lite models and reserving Pro/Pro-Extended for genuinely complex work.
 *
 * Tier mapping:
 *   0–30   → Lite       (GPT-4o-mini, Claude 3 Haiku)         $0.15–0.25/1M input
 *   31–60  → Flash      (Gemini 2.0 Flash, Claude 3.5 Sonnet) $0.50–3.00/1M input
 *   61–85  → Pro        (GPT-4o, Claude 3.5 Opus)             $2.50–15.00/1M input
 *   86–100 → Pro-Extended (GPT-5.4, Claude 4)                 $5.00–30.00/1M input
 */

export interface ComplexityScore {
  score: number;
  tier: "lite" | "flash" | "pro" | "pro-extended";
  reasoning: string;
}

/**
 * Score the complexity of a task prompt and return the recommended model tier.
 *
 * Scoring heuristics:
 * - Length of prompt (longer prompts tend to indicate more complex tasks)
 * - Presence of domain-specific keywords (security, architecture, debug)
 * - Multi-step indicators (numbered lists, "and then", "after that")
 * - Code block presence (indicates technical depth)
 */
export function scoreComplexity(prompt: string): ComplexityScore {
  let score = 20; // baseline
  const reasons: string[] = [];

  // Length factor: longer prompts suggest more complex tasks
  if (prompt.length > 2000) {
    score += 15;
    reasons.push("long prompt");
  } else if (prompt.length > 500) {
    score += 5;
    reasons.push("medium prompt");
  }

  // Security/architecture keywords push toward Pro
  const proKeywords = /\b(security|vulnerability|audit|architecture|design|penetration|compliance|threat model)\b/i;
  if (proKeywords.test(prompt)) {
    score += 25;
    reasons.push("pro-tier keywords detected");
  }

  // Multi-step indicators
  const multiStep = /\b(step \d|first.*then|after that|additionally|furthermore)\b/i;
  if (multiStep.test(prompt)) {
    score += 10;
    reasons.push("multi-step task");
  }

  // Code blocks suggest technical depth
  const codeBlocks = (prompt.match(/```/g) || []).length / 2;
  if (codeBlocks >= 2) {
    score += 15;
    reasons.push("multiple code blocks");
  } else if (codeBlocks >= 1) {
    score += 5;
    reasons.push("code block present");
  }

  // Debate/review keywords push toward simulacrum
  const debateKeywords = /\b(debate|compare|trade-?off|pros and cons|alternatives|review)\b/i;
  if (debateKeywords.test(prompt)) {
    score += 10;
    reasons.push("debate/comparison requested");
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  let tier: ComplexityScore["tier"];
  if (score <= 30) tier = "lite";
  else if (score <= 60) tier = "flash";
  else if (score <= 85) tier = "pro";
  else tier = "pro-extended";

  return {
    score,
    tier,
    reasoning: reasons.length > 0 ? reasons.join(", ") : "baseline complexity",
  };
}

/**
 * Select a model identifier for the given tier and provider.
 */
export function selectModel(
  tier: ComplexityScore["tier"],
  provider: string
): string {
  const models: Record<string, Record<string, string>> = {
    openai: {
      lite: "gpt-4o-mini",
      flash: "gpt-4o",
      pro: "gpt-4o",
      "pro-extended": "gpt-5.4",
    },
    anthropic: {
      lite: "claude-3-haiku-20241022",
      flash: "claude-3-5-sonnet-20241022",
      pro: "claude-3-5-sonnet-20241022",
      "pro-extended": "claude-4-opus-20260101",
    },
    google: {
      lite: "gemini-2.0-flash-lite",
      flash: "gemini-2.0-flash",
      pro: "gemini-2.0-pro",
      "pro-extended": "gemini-2.0-pro",
    },
  };

  return models[provider]?.[tier] ?? models.openai[tier];
}
