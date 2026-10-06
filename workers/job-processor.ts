import { prisma } from "@/lib/db";
import { jobRepo } from "@/repositories/job-repo";
import { recapRepo } from "@/repositories/recap-repo";
import { buildRecapContext } from "@/services/recap/context-builder";
import { scoreMoments } from "@/services/moments/importance-scorer";
import { generateRecapNarrative } from "@/services/ai/recap-generator";
import { renderRecapVideo } from "@/services/video/video-service";

/**
 * Generation pipeline worker.
 *
 * Processes GenerationJob rows stage-by-stage, writing real progress
 * into the DB so GET /recaps/:id/status reflects actual state — never
 * fabricated percentages.
 *
 * Concurrency: `claim` uses an atomic conditional update, so both the
 * in-process kick and a standalone `npm run worker` poller can coexist
 * without double-processing.
 */

export const STAGES = [
  { key: "collecting_data", label: "Collecting tournament data", progress: 8 },
  { key: "analyzing", label: "Analyzing performances", progress: 22 },
  { key: "finding_moments", label: "Finding biggest moments", progress: 38 },
  { key: "writing_story", label: "Writing your story", progress: 55 },
  { key: "preparing_visuals", label: "Preparing visuals", progress: 72 },
  { key: "creating_video", label: "Creating highlight video", progress: 88 },
  { key: "finalizing", label: "Finalizing recap", progress: 96 },
] as const;

const running = new Set<string>();

/** Fire-and-forget kick from the API layer. */
export function kickJob(jobId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);
  void processGenerationJob(jobId).finally(() => running.delete(jobId));
}

/** Atomic claim — returns false if another worker already owns it. */
async function claim(jobId: string): Promise<boolean> {
  const res = await prisma.generationJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  });
  return res.count === 1;
}

export async function processGenerationJob(jobId: string): Promise<void> {
  const claimed = await claim(jobId);
  if (!claimed) return; // already running elsewhere

  const job = await jobRepo.findById(jobId);
  if (!job?.recap) return;
  const recap = job.recap;

  const stage = async (i: number, progress?: number) => {
    await jobRepo.setProgress(jobId, STAGES[i].key, progress ?? STAGES[i].progress);
  };

  try {
    await recapRepo.updateStatus(recap.id, "PROCESSING", null);

    // 1–2. Collect + normalize
    await stage(0);
    const ctx = await buildRecapContext({
      tournamentId: recap.tournamentId,
      teamId: recap.teamId,
      playerId: recap.playerId,
      prefs: { type: recap.type, tone: recap.tone, duration: recap.duration },
    });

    await stage(1);

    // 3. Moment intelligence
    await stage(2);
    const starIds = ctx.playerStats
      .filter((p) => p.player.isStar)
      .map((p) => p.player.id);
    const moments = scoreMoments(ctx.matches, {
      focusTeamId: ctx.focusTeam?.id ?? ctx.focusPlayer?.team.id ?? null,
      starPlayerIds: starIds,
      limit: 8,
    });

    // 4. Narrative
    await stage(3);
    const prefs = { type: recap.type, tone: recap.tone, duration: recap.duration };
    const { output: story } = await generateRecapNarrative(ctx, prefs, moments);

    // 5–6. Visuals + video
    await stage(4);
    const rendered = await renderRecapVideo(recap.id, ctx, prefs, story, moments, {
      onStage: (s, done, total) => {
        if (s === "slides") {
          const p = 72 + Math.round((done / Math.max(total, 1)) * 12);
          void jobRepo.setProgress(jobId, "preparing_visuals", p).catch(() => {});
        } else if (s === "assembly") {
          void jobRepo.setProgress(jobId, "creating_video", 88 + done * 6).catch(() => {});
        }
      },
    });

    // 7. Persist
    await stage(6);
    await recapRepo.replaceMoments(
      recap.id,
      moments.slice(0, 6).map((m, i) => ({
        matchId: m.matchId,
        playerId: m.playerId,
        minute: m.minute,
        title: m.title,
        description: m.description,
        importanceScore: m.importanceScore,
        order: i,
      })),
    );
    await prisma.recap.update({
      where: { id: recap.id },
      data: {
        title: story.title,
        summary: story.shortSummary,
        story: story as object,
        videoUrl: rendered.videoUrl,
        thumbnailUrl: rendered.thumbnailUrl,
        videoBytes: new Uint8Array(rendered.videoBytes),
        thumbBytes: new Uint8Array(rendered.thumbBytes),
        durationSec: rendered.durationSec,
        status: "COMPLETED",
        error: null,
      },
    });
    await jobRepo.setStatus(jobId, "COMPLETED", { progress: 100 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown pipeline error";
    console.error(`[job ${jobId}] failed at ${job.stage}:`, err);
    await recapRepo.updateStatus(recap.id, "FAILED", "Generation failed. Please try again.");
    await jobRepo.setStatus(jobId, "FAILED", {
      error: message.slice(0, 500),
    });
  }
}

/**
 * Poll loop for the standalone worker (`npm run worker`).
 * Claims any QUEUED jobs the in-process kicks may have missed
 * (e.g. jobs enqueued while the app server was down).
 */
export async function pollOnce(): Promise<number> {
  const queued = await prisma.generationJob.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
  for (const j of queued) {
    void processGenerationJob(j.id);
  }
  return queued.length;
}
