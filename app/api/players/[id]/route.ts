import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";
import { NotFoundError } from "@/lib/errors";

export const GET = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const provider = getSportsProvider();
    const player = await provider.getPlayer(id);
    if (!player) throw new NotFoundError("Player");
    const matches = await provider.getMatches({ teamId: player.teamId });
    return ok({ player, teamMatches: matches });
  },
);
