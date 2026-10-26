import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { jobRepo, recapRepo } from "@/repositories/recap.repository";
import type { Recap } from "@prisma/client";
import { generateStory } from "./ai/engine";
import { analyzeData, collectData } from "./context.service";
import { mixAudio, synthBed, synthNarration } from "./video/audio";
import { buildSlides, renderFrames } from "./video/frames";
import { extractThumbnail, renderVideo, slideTotal } from "./video/render";

// ── Recap generation pipeline ───────────────────────────────
// Runs as a GenerationJob. Each stage updates the job row so the
// UI shows *real* progress — nothing is faked.
//
//   COLLECTING_DATA → ANALYZING_PERFORMANCES → FINDING_MOMENTS
//   → WRITING_STORY → PREPARING_VISUALS → RENDERING_VIDEO → FINALIZING

const LENGTH_SECONDS = { SHORT: 60, STANDARD: 120, EXTENDED: 270 } as const;

const MEDIA_ROOT = path.join(process.cwd(), "public", "generated");

export async function runRecapPipeline(recap: Recap, jobId: string) {
  const setStage = (s: Parameters<typeof jobRepo.setStage>[1]) =>
    jobRepo.setStage(jobId, s);

  try {
    // 1) Collect raw data
    await setStage("COLLECTING_DATA");
    const collected = await collectData({
      tournamentId: recap.tournamentId,
      teamId: recap.teamId ?? undefined,
      playerId: recap.playerId ?? undefined,
    });

    // 2) Analyze: stats + moments
    await setStage("ANALYZING_PERFORMANCES");
    const ctx = await analyzeData(collected, {
      type: recap.type,
      tone: recap.tone,
      length: recap.length,
      playerId: recap.playerId ?? undefined,
    });

    await setStage("FINDING_MOMENTS");
    // moments already computed inside analyzeData — persist top N
    await recapRepo.replaceMoments(
      recap.id,
      ctx.moments.slice(0, 8).map((m, i) => ({
        matchId: m.matchId,
        playerId: m.playerId ?? undefined,
        minute: m.minute,
        title: m.title,
        description: m.description,
        importanceScore: m.importanceScore,
        order: i,
      })),
    );

    // 3) AI narrative
    await setStage("WRITING_STORY");
    const { story } = await generateStory(ctx);
    await recapRepo.update(recap.id, {
      title: story.title,
      summary: story.shortSummary,
      story: story as object,
    });

    // 4) Visuals
    await setStage("PREPARING_VISUALS");
    const target = LENGTH_SECONDS[recap.length] ?? 120;
    const slides = buildSlides(ctx, story, target);
    const workDir = path.join(MEDIA_ROOT, "work", recap.id);
    await mkdir(workDir, { recursive: true });
    const framePaths = await renderFrames(slides, workDir);

    // 5) Video
    await setStage("RENDERING_VIDEO");
    const totalSec = slideTotal(slides);
    const bedPath = path.join(workDir, "bed.wav");
    const narrationPath = path.join(workDir, "narration.mp3");
    const audioPath = path.join(workDir, "audio.aac");
    await synthBed(totalSec, bedPath);
    const narrated = await synthNarration(
      `${story.shortSummary} ${story.finalVerdict}`,
      narrationPath,
    );
    await mixAudio(bedPath, narrated ? narrationPath : null, audioPath);

    const outDir = path.join(MEDIA_ROOT, "recaps");
    const videoPath = path.join(outDir, `${recap.id}.mp4`);
    await renderVideo({
      framePaths,
      slides,
      audioPath,
      workDir,
      outPath: videoPath,
    });

    const thumbPath = path.join(outDir, `${recap.id}.jpg`);
    try {
      await extractThumbnail(videoPath, thumbPath);
    } catch {
      // thumbnail is nice-to-have — never fail the job over it
    }

    // 6) Finalize
    await setStage("FINALIZING");
    const durationSec = Math.round(totalSec);
    await recapRepo.update(recap.id, {
      status: "READY",
      videoUrl: `/generated/recaps/${recap.id}.mp4`,
      thumbnailUrl: `/generated/recaps/${recap.id}.jpg`,
      durationSec,
      error: null,
    });
    await jobRepo.complete(jobId);
    await prisma.analyticsEvent.create({
      data: {
        userId: recap.userId,
        event: "recap_completed",
        metadata: { recapId: recap.id, tournament: ctx.tournament.name },
      },
    });

    // Cleanup work dir (keep it on failure for debugging)
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[pipeline] recap ${recap.id} failed:`, err);
    await recapRepo.setStatus(recap.id, "FAILED", message);
    await jobRepo.fail(jobId, message);
    throw err;
  }
}
