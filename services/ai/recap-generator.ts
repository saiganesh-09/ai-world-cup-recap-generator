import OpenAI from "openai";
import { getEnv, hasOpenAI } from "@/lib/env";
import { parseAiRecap } from "./schemas";
import { buildRecapPrompt } from "./prompts";
import { generateFallbackRecap } from "./fallback-generator";
import type {
  AiRecapOutput,
  RecapContext,
  RecapPreferences,
  ScoredMoment,
} from "@/types";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  client ??= new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  return client;
}

export interface RecapGenerationResult {
  output: AiRecapOutput;
  engine: "openai" | "fallback";
}

/**
 * Generates the recap narrative.
 *
 * Order of attempts:
 *   1. OpenAI JSON-mode completion → zod validation
 *   2. One retry on parse/transport failure
 *   3. Deterministic rule-based generator (always succeeds)
 */
export async function generateRecapNarrative(
  ctx: RecapContext,
  prefs: RecapPreferences,
  moments: ScoredMoment[],
): Promise<RecapGenerationResult> {
  if (!hasOpenAI()) {
    return {
      output: generateFallbackRecap(ctx, prefs, moments),
      engine: "fallback",
    };
  }

  const { system, user } = buildRecapPrompt(ctx, prefs, moments);
  const openai = getClient();
  const env = getEnv();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: env.OPENAI_TEXT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000,
      });
      const raw = res.choices[0]?.message?.content;
      if (!raw) throw new Error("empty completion");
      const parsed = parseAiRecap(JSON.parse(raw));
      return { output: parsed, engine: "openai" };
    } catch (err) {
      console.warn(
        `[ai] narrative attempt ${attempt + 1} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.warn("[ai] falling back to deterministic generator");
  return {
    output: generateFallbackRecap(ctx, prefs, moments),
    engine: "fallback",
  };
}
