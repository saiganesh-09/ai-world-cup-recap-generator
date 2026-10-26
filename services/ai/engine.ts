import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";
import type { RecapContext } from "@/types/domain";
import { generateFallbackStory } from "./fallback";
import { buildRecapPrompt } from "./prompts";
import { parseRecapStory, type RecapStory } from "./schemas";

// ── AI Engine ───────────────────────────────────────────────
// OpenAI structured output with zod validation. On any failure —
// missing key, timeout, malformed JSON — falls back to the
// deterministic generator so a recap is never left empty.

let client: OpenAI | null = null;
function getClient() {
  if (!hasOpenAI) return null;
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 30_000 });
  return client;
}

export interface GeneratedStory {
  story: RecapStory;
  source: "openai" | "fallback";
}

export async function generateStory(ctx: RecapContext): Promise<GeneratedStory> {
  const openai = getClient();
  if (!openai) {
    return { story: generateFallbackStory(ctx), source: "fallback" };
  }

  try {
    const { system, user } = buildRecapPrompt(ctx);
    const res = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = res.choices[0]?.message?.content;
    if (!raw) throw new Error("empty completion");
    // Schema validation — malformed output never reaches the DB.
    const story = parseRecapStory(JSON.parse(raw));
    return { story, source: "openai" };
  } catch (err) {
    console.error("[ai] generation failed, using fallback:", err);
    return { story: generateFallbackStory(ctx), source: "fallback" };
  }
}
