import { errorResponse, ok } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { teamRepo } from "@/repositories/sports.repository";
import { matchResult, teamStats } from "@/services/stats.service";

export async function GET(_req: Request, ctx: RouteContext<"/api/teams/[id]">) {
  try {
    const { id } = await ctx.params;
    const team = await teamRepo.detail(id);
    if (!team) throw new NotFoundError("Team");
    const tournamentId = new URL(_req.url).searchParams.get("tournamentId") ?? undefined;
    const matches = await teamRepo.matches(id, tournamentId);
    const stats = teamStats(matches, id);
    return ok({ ...team, matches: matches.map((m) => ({ ...m, result: matchResult(m, id) })), stats });
  } catch (err) {
    return errorResponse(err);
  }
}
