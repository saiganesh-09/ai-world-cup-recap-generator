import { errorResponse, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { recapRepo } from "@/repositories/recap.repository";

export async function GET(_req: Request, ctx: RouteContext<"/api/recaps/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    // Owner-scoped lookup — users can only ever read their own recaps.
    const recap = await recapRepo.forUserById(id, user.id);
    if (!recap) throw new NotFoundError("Recap");
    return ok(recap);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/recaps/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const recap = await recapRepo.forUserById(id, user.id);
    if (!recap) throw new NotFoundError("Recap");
    await prisma.generationJob.deleteMany({ where: { recapId: id } });
    await recapRepo.delete(id);
    await prisma.analyticsEvent.create({
      data: { userId: user.id, event: "recap_deleted", metadata: { recapId: id } },
    });
    return ok({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
