import { errorResponse, ok } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { matchRepo } from "@/repositories/sports.repository";

export async function GET(_req: Request, ctx: RouteContext<"/api/matches/[id]">) {
  try {
    const { id } = await ctx.params;
    const match = await matchRepo.byId(id);
    if (!match) throw new NotFoundError("Match");
    return ok(match);
  } catch (err) {
    return errorResponse(err);
  }
}
