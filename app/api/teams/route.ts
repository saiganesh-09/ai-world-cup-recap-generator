import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";

export const GET = apiHandler(async (req: Request) => {
  const url = new URL(req.url);
  const tournamentId = url.searchParams.get("tournamentId") ?? undefined;
  const q = url.searchParams.get("q")?.toLowerCase();

  let teams = await getSportsProvider().getTeams(tournamentId);
  if (q) {
    teams = teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q),
    );
  }
  return ok({ teams });
});
