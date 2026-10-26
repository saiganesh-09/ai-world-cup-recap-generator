import { errorResponse, ok } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { tournamentRepo } from "@/repositories/sports.repository";

export async function GET(_req: Request, ctx: RouteContext<"/api/tournaments/[id]">) {
  try {
    const { id } = await ctx.params;
    const tournament = await tournamentRepo.withTeams(id);
    if (!tournament) throw new NotFoundError("Tournament");
    return ok(tournament);
  } catch (err) {
    return errorResponse(err);
  }
}
