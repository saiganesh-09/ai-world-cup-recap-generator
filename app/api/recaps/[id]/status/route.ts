import { errorResponse, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { recapRepo } from "@/repositories/recap.repository";

// Lightweight polling endpoint the UI hits while a recap generates.
export async function GET(_req: Request, ctx: RouteContext<"/api/recaps/[id]/status">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const recap = await recapRepo.forUserById(id, user.id);
    if (!recap) throw new NotFoundError("Recap");
    return ok({
      status: recap.status,
      videoUrl: recap.videoUrl,
      title: recap.title,
      job: recap.job
        ? {
            status: recap.job.status,
            stage: recap.job.stage,
            progress: recap.job.progress,
            error: recap.job.error,
          }
        : null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
