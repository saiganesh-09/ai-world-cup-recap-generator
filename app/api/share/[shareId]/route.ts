import { apiHandler, ok } from "@/lib/api";
import { recapRepo } from "@/repositories/recap-repo";
import { NotFoundError } from "@/lib/errors";
import { track } from "@/services/analytics";

/** Public read of a shared recap — no auth, public recaps only. */
export const GET = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ shareId: string }> }) => {
    const { shareId } = await ctx.params;
    const recap = await recapRepo.findByShareId(shareId);
    if (!recap || !recap.isPublic) throw new NotFoundError("Recap");
    track("recap_shared", { recapId: recap.id });
    const { userId: _userId, ...publicRecap } = recap;
    return ok({ recap: publicRecap });
  },
);
