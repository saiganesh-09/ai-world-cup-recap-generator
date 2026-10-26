import { z } from "zod";

// The contract every AI recap must satisfy. Model output is parsed
// through this schema — malformed generations are rejected and the
// deterministic fallback is used instead. Never trust raw model JSON.

export const keyPlayerSchema = z.object({
  name: z.string().min(1),
  note: z.string().min(1),
});

export const recapStorySchema = z.object({
  title: z.string().min(4).max(120),
  shortSummary: z.string().min(10).max(400),
  tournamentStory: z.string().min(40),
  biggestMoments: z.array(z.string().min(4)).min(2).max(8),
  keyPlayers: z.array(keyPlayerSchema).min(1).max(6),
  turningPoints: z.array(z.string().min(4)).min(1).max(6),
  statisticsHighlights: z.array(z.string().min(4)).min(2).max(8),
  finalVerdict: z.string().min(10),
});

export type RecapStory = z.infer<typeof recapStorySchema>;

export function parseRecapStory(raw: unknown): RecapStory {
  return recapStorySchema.parse(raw);
}
