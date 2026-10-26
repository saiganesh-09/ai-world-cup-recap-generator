import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Slide } from "./frames";

// ── FFmpeg assembly ─────────────────────────────────────────
// Slides (PNG) → concat → xfade transitions → mux with audio → mp4.
// If the xfade chain fails for any reason, we retry with a plain
// concat — a finished video always beats a perfect pipeline that
// didn't ship.

const FADE = 0.6; // xfade duration

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath as string, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
    p.on("error", reject);
    if (process.env.DEBUG_FFMPEG) p.stderr.on("data", (d) => process.stderr.write(d));
    void err;
  });
}

export function slideTotal(slides: Slide[]) {
  return slides.reduce((s, x) => s + x.duration, 0);
}

async function writeConcatList(paths: string[], slides: Slide[], file: string) {
  const lines: string[] = [];
  for (const [i, p] of paths.entries()) {
    lines.push(`file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${slides[i].duration}`);
  }
  lines.push(`file '${paths[paths.length - 1].replace(/\\/g, "/").replace(/'/g, "'\\''")}'`);
  await writeFile(file, lines.join("\n"));
}

/** Concat demuxer + crossfade chain via per-slide loops + xfade. */
async function renderWithXfade(
  paths: string[],
  slides: Slide[],
  audioPath: string,
  outPath: string,
) {
  const inputs = paths.flatMap((p, i) => [
    "-loop", "1", "-t", String(slides[i].duration + FADE), "-i", p,
  ]);
  // xfade offsets: offset_k = sum(dur[0..k]) - FADE*(k+1)
  let filter = "";
  let acc = slides[0].duration;
  let prev = "[0:v]";
  for (let i = 1; i < paths.length; i++) {
    const offset = Math.max(0.1, acc - FADE);
    const out = i === paths.length - 1 ? "[vout]" : `[v${i}]`;
    filter += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}${out};`;
    prev = out;
    acc += slides[i].duration - FADE;
  }
  filter += `[vout]format=yuv420p,fps=30[vfinal]`;
  const audioIdx = paths.length;
  await run([
    ...inputs,
    "-i", audioPath,
    "-filter_complex", filter,
    "-map", "[vfinal]", "-map", `${audioIdx}:a`,
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-movflags", "+faststart",
    "-y", outPath,
  ]);
}

async function renderPlain(
  paths: string[],
  slides: Slide[],
  audioPath: string,
  outPath: string,
) {
  const listPath = `${outPath}.concat.txt`;
  await writeConcatList(paths, slides, listPath);
  await run([
    "-f", "concat", "-safe", "0", "-i", listPath,
    "-i", audioPath,
    "-vf", "fps=30,format=yuv420p,fade=t=in:st=0:d=0.8,fade=t=out:st=" + Math.max(0, slideTotal(slides) - 1).toFixed(1) + ":d=1",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-movflags", "+faststart",
    "-y", outPath,
  ]);
}

export async function renderVideo(opts: {
  framePaths: string[];
  slides: Slide[];
  audioPath: string;
  workDir: string;
  outPath: string;
}): Promise<void> {
  await mkdir(path.dirname(opts.outPath), { recursive: true });
  const attempts: (() => Promise<void>)[] = [
    () => renderWithXfade(opts.framePaths, opts.slides, opts.audioPath, opts.outPath),
    () => renderPlain(opts.framePaths, opts.slides, opts.audioPath, opts.outPath),
    () => renderPlain(opts.framePaths, opts.slides, opts.audioPath, opts.outPath),
  ];
  let lastErr: unknown;
  for (const [i, attempt] of attempts.entries()) {
    try {
      await attempt();
      return;
    } catch (err) {
      lastErr = err;
      console.error(`[video] render attempt ${i + 1} failed:`, err);
    }
  }
  throw lastErr;
}

/** Extract a poster frame for the recap thumbnail. */
export async function extractThumbnail(videoPath: string, outPath: string) {
  await run([
    "-ss", "2", "-i", videoPath,
    "-frames:v", "1", "-q:v", "3",
    "-y", outPath,
  ]);
}
