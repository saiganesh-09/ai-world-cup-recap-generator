import { z } from "zod";
import type { AiRecapOutput } from "@/types";

/**
 * The AI must return exactly this shape. Anything else is rejected and
 * the pipeline falls back to the deterministic generator — we never
 * trust arbitrary model output.
 */
export const aiMomentSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(1200),
  minute: z.number().int().min(0).max(130).optional(),
  matchLabel: z.string().max(120).optional(),
});

export const aiRecapSchema = z.object({
  title: z.string().min(4).max(120),
  shortSummary: z.string().min(20).max(400),
  tournamentStory: z.string().min(100).max(8000),
  biggestMoments: z.array(aiMomentSchema).min(1).max(8),
  keyPlayers: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        note: z.string().min(5).max(300),
      }),
    )
    .min(1)
    .max(6),
  turningPoints: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().min(10).max(600),
      }),
    )
    .max(5),
  statisticsHighlights: z
    .array(
      z.object({
        label: z.string().min(2).max(60),
        value: z.string().min(1).max(40),
        note: z.string().max(160).optional(),
      }),
    )
    .min(1)
    .max(8),
  finalVerdict: z.string().min(20).max(800),
}) satisfies z.ZodType<AiRecapOutput>;

export function parseAiRecap(raw: unknown): AiRecapOutput {
  return aiRecapSchema.parse(raw);
}
