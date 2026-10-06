import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";

export const GET = apiHandler(async (req: Request) => {
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId") ?? undefined;
  const tournamentId = url.searchParams.get("tournamentId") ?? undefined;
  const position = url.searchParams.get("position") ?? undefined;
  const q = url.searchParams.get("q")?.toLowerCase();

  let players = await getSportsProvider().getPlayers({ teamId, tournamentId });
  if (position) players = players.filter((p) => p.player.position === position);
  if (q) players = players.filter((p) => p.player.name.toLowerCase().includes(q));
  return ok({ players });
});
