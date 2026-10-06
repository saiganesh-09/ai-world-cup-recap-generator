import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";
import { NotFoundError } from "@/lib/errors";

export const GET = apiHandler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const provider = getSportsProvider();
    const url = new URL(req.url);
    const tournamentId = url.searchParams.get("tournamentId");

    const team = await provider.getTeam(id);
    if (!team) throw new NotFoundError("Team");

    const [matches, players] = await Promise.all([
      provider.getMatches({ teamId: id, ...(tournamentId ? { tournamentId } : {}) }),
      provider.getPlayers({ teamId: id, ...(tournamentId ? { tournamentId } : {}) }),
    ]);
    const stats = tournamentId
      ? await provider.getTeamTournamentStats(id, tournamentId)
      : null;

    return ok({ team, matches, players, stats });
  },
);
