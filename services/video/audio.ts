import OpenAI from "openai";
import { writeFile } from "node:fs/promises";
import { getEnv, hasOpenAI } from "@/lib/env";
import type { AiRecapOutput, RecapContext, RecapPreferences } from "@/types";

let client: OpenAI | null = null;

/**
 * Builds a tight spoken script for narration — the story arc condensed
 * to roughly `words` words so it fits under the video length.
 */
export function buildNarrationScript(
  ctx: RecapContext,
  prefs: RecapPreferences,
  story: AiRecapOutput,
): string {
  const subject = ctx.focusPlayer?.name ?? ctx.focusTeam?.name ?? ctx.tournament.name;
  const ts = ctx.teamStats;
  const record = ts ? `${ts.won} wins, ${ts.drawn} draws, ${ts.lost} defeats` : "";
  const topMoment = story.biggestMoments[0];

  const budget = prefs.duration === "SHORT" ? 110 : prefs.duration === "EXTENDED" ? 420 : 220;

  const parts = [
    `${ctx.tournament.name}. The story of ${subject}.`,
    record ? `${subject} played ${ts!.played} matches: ${record}, finishing ${ts!.bestFinish}.` : "",
    story.shortSummary,
    topMoment ? `The biggest moment: ${topMoment.description}` : "",
    story.turningPoints[0] ? `${story.turningPoints[0].title}. ${story.turningPoints[0].description}` : "",
    story.finalVerdict,
  ].filter(Boolean);

  // Trim to word budget
  const words = parts.join(" ").split(/\s+/);
  return words.slice(0, budget).join(" ");
}

/**
 * Synthesizes narration via OpenAI TTS into an mp3 file.
 * Returns the file path, or null when no key / on failure — the video
 * then ships with just the ambient audio bed.
 */
export async function synthesizeNarration(
  script: string,
  outFile: string,
): Promise<string | null> {
  if (!hasOpenAI() || script.trim().length === 0) return null;
  client ??= new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  try {
    const res = await client.audio.speech.create({
      model: getEnv().OPENAI_TTS_MODEL,
      voice: "onyx",
      input: script,
      response_format: "mp3",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(outFile, buf);
    return outFile;
  } catch (err) {
    console.warn(
      "[video] narration synthesis failed, continuing without it:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
