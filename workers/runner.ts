import { jobRepo, recapRepo } from "@/repositories/recap.repository";
import { runRecapPipeline } from "@/services/recap.service";

// Shared job execution — used by the standalone worker and by
// inline (dev-mode) execution inside the Next.js process.

export async function processJob(recapId: string, jobId: string) {
  const recap = await recapRepo.byId(recapId);
  if (!recap) {
    await jobRepo.fail(jobId, "Recap not found");
    return;
  }
  await recapRepo.setStatus(recapId, "GENERATING");
  await runRecapPipeline(recap, jobId);
}
