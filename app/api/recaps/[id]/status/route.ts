import { apiHandler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedRecap } from "@/services/recap/recap-service";
import { jobRepo } from "@/repositories/job-repo";
import { STAGES } from "@/workers/job-processor";

export const GET = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser();
    const recap = await getOwnedRecap(id, user.id);
    const job = await jobRepo.latestForRecap(recap.id);

    return ok({
      recapStatus: recap.status,
      videoUrl: recap.videoUrl,
      error: recap.error,
      job: job
        ? {
            id: job.id,
            status: job.status,
            stage: job.stage,
            stageLabel:
              STAGES.find((s) => s.key === job.stage)?.label ?? job.stage,
            progress: job.progress,
            error: job.status === "FAILED" ? job.error : null,
          }
        : null,
      stages: STAGES,
    });
  },
);
