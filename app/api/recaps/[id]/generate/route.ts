import { errorResponse, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { AppError, NotFoundError } from "@/lib/errors";
import { rateLimitRecapGeneration } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { jobRepo, recapRepo } from "@/repositories/recap.repository";
import { processJob } from "@/workers/runner";

// Enqueues the generation job. In production a separate worker
// process claims it (npm run worker); in dev we also run it inline
// after the response is sent, so a worker isn't required locally.

const INLINE_DEV = process.env.WORKER_INLINE !== "false";

export async function POST(_req: Request, ctx: RouteContext<"/api/recaps/[id]/generate">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const recap = await recapRepo.forUserById(id, user.id);
    if (!recap) throw new NotFoundError("Recap");
    if (recap.status === "GENERATING") {
      throw new AppError("Already generating", 409, "This recap is already being generated.");
    }

    // Expensive operation → per-user rate limit.
    rateLimitRecapGeneration(user.id, env.RATE_LIMIT_RECAPS_PER_HOUR);

    // Idempotent: one job per recap; reset it when re-generating.
    const existing = await jobRepo.byRecapId(id);
    const job = existing
      ? await prisma.generationJob.update({
          where: { recapId: id },
          data: {
            status: "PENDING",
            stage: "QUEUED",
            progress: 0,
            error: null,
            lockedAt: null,
            startedAt: null,
            completedAt: null,
          },
        })
      : await jobRepo.create(id);
    if (!job) throw new AppError("Failed to enqueue job");

    if (INLINE_DEV) {
      // Fire-and-forget inside this process. The response returns
      // immediately; progress is polled via /status.
      setImmediate(() => {
        processJob(id, job.id).catch((e) =>
          console.error(`[inline-worker] job ${job.id} failed:`, e),
        );
      });
    }

    return ok({ jobId: job.id, status: "PENDING" }, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}
