import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { ExternalServiceError } from "@/lib/errors";

const execFileAsync = promisify(execFile);

const XFADE = 0.6; // crossfade seconds between slides
const FPS = 30;

export interface FrameSpec {
  path: string;
  durationSec: number;
}

export interface AssembleOptions {
  frames: FrameSpec[];
  narrationFile?: string | null;
  outFile: string;
  timeoutMs?: number;
}

function getFfmpeg(): string {
  if (!ffmpegPath) throw new ExternalServiceError("FFmpeg", "binary not found");
  return ffmpegPath;
}

/**
 * Assembles slide PNGs into an mp4 with crossfade transitions and a
 * synthesized ambient audio bed (+ optional TTS narration mixed in).
 *
 * All inputs are generated media — no copyrighted footage anywhere.
 */
export async function assembleVideo(opts: AssembleOptions): Promise<void> {
  const { frames, narrationFile, outFile } = opts;
  if (frames.length === 0) throw new Error("no frames to assemble");

  const totalVideo = frames.reduce((s, f) => s + f.durationSec, 0);

  const args: string[] = ["-y"];
  for (const f of frames) {
    args.push("-loop", "1", "-t", f.durationSec.toFixed(2), "-i", f.path);
  }
  // Ambient bed inputs: a soft triad pad
  const amb0 = frames.length;
  const amb1 = frames.length + 1;
  const amb2 = frames.length + 2;
  args.push("-f", "lavfi", "-i", `sine=frequency=196:duration=${totalVideo.toFixed(2)}`);
  args.push("-f", "lavfi", "-i", `sine=frequency=246.94:duration=${totalVideo.toFixed(2)}`);
  args.push("-f", "lavfi", "-i", `sine=frequency=329.63:duration=${totalVideo.toFixed(2)}`);

  let narrationIdx: number | null = null;
  if (narrationFile) {
    narrationIdx = frames.length + 3;
    args.push("-i", narrationFile);
  }

  // ── Video chain: normalize → xfade ──
  const filters: string[] = [];
  frames.forEach((_, i) => {
    filters.push(
      `[${i}:v]scale=1280:720,fps=${FPS},format=yuv420p,setsar=1[v${i}]`,
    );
  });
  let prev = "v0";
  let offset = 0;
  for (let i = 1; i < frames.length; i++) {
    offset += frames[i - 1].durationSec - (i === 1 ? 0 : 0) - XFADE;
    // offsets are cumulative: sum of prior durations minus accumulated fades
    const label = i === frames.length - 1 ? "vout" : `x${i}`;
    filters.push(
      `[${prev}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(2)}[${label}]`,
    );
    prev = label;
  }
  if (frames.length === 1) {
    filters.push(`[v0]copy[vout]`);
  }

  // ── Audio chain ──
  const fadeOut = Math.max(0, totalVideo - 3);
  filters.push(
    `[${amb0}:a][${amb1}:a][${amb2}:a]amix=inputs=3:duration=first:normalize=0,volume=0.05,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut.toFixed(2)}:d=3,apad=whole_dur=${totalVideo.toFixed(2)}[amb]`,
  );
  if (narrationIdx != null) {
    filters.push(`[${narrationIdx}:a]adelay=2500|2500,volume=1.4[vo]`);
    filters.push(
      `[amb][vo]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    );
  } else {
    filters.push(`[amb]acopy[aout]`);
  }

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[vout]",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-shortest",
    outFile,
  );

  try {
    await execFileAsync(getFfmpeg(), args, {
      timeout: opts.timeoutMs ?? 180_000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (err) {
    const detail =
      err instanceof Error && "stderr" in err
        ? String((err as { stderr?: string }).stderr).slice(-500)
        : String(err);
    throw new ExternalServiceError("Video renderer", detail);
  }
}
