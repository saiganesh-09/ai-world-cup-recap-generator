import { mkdir, writeFile, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  AiRecapOutput,
  RecapContext,
  RecapPreferences,
  ScoredMoment,
} from "@/types";
import { buildTimeline } from "./timeline-builder";
import { renderSlidePng } from "./slide-renderer";
import { assembleVideo } from "./ffmpeg-runner";
import { buildNarrationScript, synthesizeNarration } from "./audio";

export interface RenderedVideo {
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
  slides: number;
  narrationIncluded: boolean;
}

const TMP_ROOT = path.join(process.cwd(), "tmp-media");
const PUBLIC_ROOT = path.join(process.cwd(), "public", "generated");

export interface VideoRenderHooks {
  onStage?: (stage: "slides" | "audio" | "assembly", done: number, total: number) => void;
}

/**
 * Renders a full recap video:
 *   storyboard → SVG slides → PNG frames → optional TTS narration →
 *   ffmpeg assembly (xfade + ambient audio) → public/generated/<id>/
 */
export async function renderRecapVideo(
  recapId: string,
  ctx: RecapContext,
  prefs: RecapPreferences,
  story: AiRecapOutput,
  moments: ScoredMoment[],
  hooks?: VideoRenderHooks,
): Promise<RenderedVideo> {
  const workDir = path.join(TMP_ROOT, recapId);
  const outDir = path.join(PUBLIC_ROOT, recapId);
  await mkdir(workDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  try {
    const slides = buildTimeline(ctx, prefs, story, moments);

    // 1. Render frames
    const frames: { path: string; durationSec: number }[] = [];
    for (let i = 0; i < slides.length; i++) {
      const png = await renderSlidePng(slides[i]);
      const file = path.join(workDir, `frame-${String(i).padStart(3, "0")}.png`);
      await writeFile(file, png);
      frames.push({ path: file, durationSec: slides[i].durationSec });
      hooks?.onStage?.("slides", i + 1, slides.length);
    }

    // Thumbnail = the subject slide (index 1) or intro
    const thumbSrc = frames[1]?.path ?? frames[0].path;
    const thumbPath = path.join(outDir, "thumbnail.png");
    await cp(thumbSrc, thumbPath);

    // 2. Narration (best-effort)
    hooks?.onStage?.("audio", 0, 1);
    const script = buildNarrationScript(ctx, prefs, story);
    const narrationFile = await synthesizeNarration(
      script,
      path.join(workDir, "narration.mp3"),
    );
    hooks?.onStage?.("audio", 1, 1);

    // 3. Assemble
    hooks?.onStage?.("assembly", 0, 1);
    const videoPath = path.join(outDir, "video.mp4");
    await assembleVideo({
      frames,
      narrationFile,
      outFile: videoPath,
    });
    hooks?.onStage?.("assembly", 1, 1);

    if (!existsSync(videoPath)) {
      throw new Error("ffmpeg finished but no output was produced");
    }

    const durationSec =
      frames.reduce((s, f) => s + f.durationSec, 0) -
      0.6 * (frames.length - 1);

    return {
      videoUrl: `/generated/${recapId}/video.mp4`,
      thumbnailUrl: `/generated/${recapId}/thumbnail.png`,
      durationSec: Math.max(1, Math.round(durationSec)),
      slides: slides.length,
      narrationIncluded: narrationFile != null,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
