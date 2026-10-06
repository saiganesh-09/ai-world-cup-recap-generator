import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";
import { NotFoundError } from "@/lib/errors";

export const GET = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const tournament = await getSportsProvider().getTournament(id);
    if (!tournament) throw new NotFoundError("Tournament");
    return ok({ tournament });
  },
);
