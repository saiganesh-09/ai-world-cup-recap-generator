import { errorResponse, ok } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { playerRepo } from "@/repositories/sports.repository";

export async function GET(_req: Request, ctx: RouteContext<"/api/players/[id]">) {
  try {
    const { id } = await ctx.params;
    const player = await playerRepo.byId(id);
    if (!player) throw new NotFoundError("Player");
    const stats = await playerRepo.statsForPlayer(id);
    const aggregate = stats.reduce(
      (a, s) => ({
        appearances: a.appearances + 1,
        goals: a.goals + s.goals,
        assists: a.assists + s.assists,
        minutes: a.minutes + s.minutes,
        ratingSum: a.ratingSum + s.rating,
      }),
      { appearances: 0, goals: 0, assists: 0, minutes: 0, ratingSum: 0 },
    );
    return ok({
      ...player,
      stats: stats.map((s) => ({
        matchId: s.matchId,
        date: s.match.date,
        home: s.match.homeTeam.name,
        away: s.match.awayTeam.name,
        homeScore: s.match.homeScore,
        awayScore: s.match.awayScore,
        stage: s.match.stage,
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        rating: s.rating,
      })),
      aggregate: {
        ...aggregate,
        avgRating: aggregate.appearances
          ? Math.round((aggregate.ratingSum / aggregate.appearances) * 100) / 100
          : 0,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
