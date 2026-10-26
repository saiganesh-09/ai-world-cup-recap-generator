import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";
import { writeFile } from "node:fs/promises";

// ── Audio pipeline ──────────────────────────────────────────
// 1) Procedural ambient bed synthesized via ffmpeg lavfi filters —
//    always available, zero licensing concerns.
// 2) Optional AI narration via OpenAI TTS, mixed under the bed.

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath as string, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-400)}`)),
    );
  });
}

/** Layered sine-pad ambient bed with slow swell + fade in/out. */
export async function synthBed(durationSec: number, outPath: string) {
  const d = durationSec.toFixed(1);
  const chords = ["sine=frequency=110", "sine=frequency=165", "sine=frequency=220", "sine=frequency=277"];
  const inputs = chords.flatMap((c) => ["-f", "lavfi", "-i", `${c}:duration=${d}`]);
  const filter =
    `[0:a][1:a][2:a][3:a]amix=inputs=4:normalize=1,` +
    `lowpass=f=900,volume=0.28,` +
    `tremolo=f=0.25:d=0.4,` +
    `afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, durationSec - 3).toFixed(1)}:d=3` +
    `[aout]`;
  await run([...inputs, "-filter_complex", filter, "-map", "[aout]", "-y", outPath]);
}

/** Optional narration via OpenAI TTS → mp3. Returns null if unavailable. */
export async function synthNarration(text: string, outPath: string): Promise<boolean> {
  if (!hasOpenAI) return false;
  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 60_000 });
    const res = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text.slice(0, 3800),
      response_format: "mp3",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(outPath, buf);
    return true;
  } catch (err) {
    console.error("[audio] TTS failed, continuing without narration:", err);
    return false;
  }
}

/** Mix narration over the bed (ducked). Falls back to bed-only. */
export async function mixAudio(bedPath: string, narrationPath: string | null, outPath: string) {
  if (!narrationPath) {
    await run(["-i", bedPath, "-c:a", "aac", "-y", outPath]);
    return;
  }
  await run([
    "-i", bedPath,
    "-i", narrationPath,
    "-filter_complex",
    "[0:a]volume=0.5[bed];[bed][1:a]amix=inputs=2:normalize=0:weights=0.4,1[aout]",
    "-map", "[aout]", "-y", outPath,
  ]);
}
