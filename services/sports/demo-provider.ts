import type {
  NormalizedMatch,
  PlayerTournamentStats,
  TeamRef,
  TeamTournamentStats,
} from "@/types";
import type { SportsDataProvider } from "./provider";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/cache";
import type {
  Match,
  MatchEvent,
  Player,
  Team,
  TeamMatchStat,
  Tournament,
} from "@prisma/client";

const TTL = 60_000; // 60s — seed data rarely changes

function toTeamRef(t: Team): TeamRef {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    country: t.country,
    flag: t.flag,
    primaryColor: t.primaryColor,
    accentColor: t.accentColor,
    fifaRanking: t.fifaRanking,
  };
}

type MatchWithRelations = Match & {
  homeTeam: Team;
  awayTeam: Team;
  events: (MatchEvent & {
    player: Player | null;
    assistPlayer: Player | null;
  })[];
  teamStats: TeamMatchStat[];
};

function toNormalizedMatch(m: MatchWithRelations): NormalizedMatch {
  const home = m.teamStats.find((s) => s.teamId === m.homeTeamId) ?? null;
  const away = m.teamStats.find((s) => s.teamId === m.awayTeamId) ?? null;
  return {
    id: m.id,
    date: m.date.toISOString(),
    venue: m.venue,
    stage: m.stage,
    status: m.status,
    homeTeam: toTeamRef(m.homeTeam),
    awayTeam: toTeamRef(m.awayTeam),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenalties: m.homePenalties,
    awayPenalties: m.awayPenalties,
    events: m.events
      .sort((a, b) => a.minute - b.minute)
      .map((e) => ({
        id: e.id,
        minute: e.minute,
        type: e.type,
        teamId: e.teamId,
        playerId: e.playerId,
        playerName: e.player?.name ?? null,
        assistPlayerId: e.assistPlayerId,
        assistPlayerName: e.assistPlayer?.name ?? null,
        description: e.description,
      })),
    homeStats: home
      ? {
          possession: home.possession,
          shots: home.shots,
          shotsOnTarget: home.shotsOnTarget,
          corners: home.corners,
          fouls: home.fouls,
        }
      : null,
    awayStats: away
      ? {
          possession: away.possession,
          shots: away.shots,
          shotsOnTarget: away.shotsOnTarget,
          corners: away.corners,
          fouls: away.fouls,
        }
      : null,
  };
}

const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  events: { include: { player: true, assistPlayer: true } },
  teamStats: true,
} as const;

/**
 * DemoDataProvider — serves the seeded dataset through the exact same
 * interface a live sports API would. This keeps the whole app fully
 * functional offline and gives tests a deterministic fixture.
 */
export class DemoDataProvider implements SportsDataProvider {
  readonly kind = "demo" as const;

  getTournaments(): Promise<Tournament[]> {
    return cached("tournaments", TTL, () =>
      prisma.tournament.findMany({ orderBy: { year: "desc" } }),
    );
  }

  getTournament(id: string): Promise<Tournament | null> {
    return cached(`tournament:${id}`, TTL, () =>
      prisma.tournament.findUnique({ where: { id } }),
    );
  }

  async getTeams(tournamentId?: string): Promise<TeamRef[]> {
    return cached(`teams:${tournamentId ?? "all"}`, TTL, async () => {
      if (!tournamentId) {
        const teams = await prisma.team.findMany({
          orderBy: { fifaRanking: "asc" },
        });
        return teams.map(toTeamRef);
      }
      // Teams that actually played in this tournament (distinct via matches)
      const matches = await prisma.match.findMany({
        where: { tournamentId },
        select: {
          homeTeam: true,
          awayTeam: true,
        },
      });
      const map = new Map<string, Team>();
      for (const m of matches) {
        map.set(m.homeTeam.id, m.homeTeam);
        map.set(m.awayTeam.id, m.awayTeam);
      }
      return [...map.values()]
        .map(toTeamRef)
        .sort((a, b) => (a.fifaRanking ?? 99) - (b.fifaRanking ?? 99));
    });
  }

  async getTeam(id: string) {
    return cached(`team:${id}`, TTL, async () => {
      const team = await prisma.team.findUnique({
        where: { id },
        include: { players: { orderBy: { jerseyNumber: "asc" } } },
      });
      if (!team) return null;
      return {
        ...toTeamRef(team),
        players: team.players.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          jerseyNumber: p.jerseyNumber,
          isStar: p.isStar,
        })),
      };
    });
  }

  async getPlayers(opts?: {
    teamId?: string;
    tournamentId?: string;
  }): Promise<PlayerTournamentStats[]> {
    const key = `players:${opts?.teamId ?? "all"}:${opts?.tournamentId ?? "all"}`;
    return cached(key, TTL, async () => {
      const stats = await prisma.playerMatchStat.findMany({
        where: {
          player: opts?.teamId ? { teamId: opts.teamId } : undefined,
          match: opts?.tournamentId
            ? { tournamentId: opts.tournamentId }
            : undefined,
        },
        include: { player: true },
      });
      const byPlayer = new Map<
        string,
        PlayerTournamentStats & { _ratingSum: number }
      >();
      for (const s of stats) {
        const agg =
          byPlayer.get(s.playerId) ??
          ({
            player: {
              id: s.player.id,
              name: s.player.name,
              position: s.player.position,
              jerseyNumber: s.player.jerseyNumber,
              isStar: s.player.isStar,
            },
            teamId: s.player.teamId,
            appearances: 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            shots: 0,
            tackles: 0,
            avgRating: 0,
            _ratingSum: 0,
          });
        agg.appearances += 1;
        agg.minutes += s.minutes;
        agg.goals += s.goals;
        agg.assists += s.assists;
        agg.shots += s.shots;
        agg.tackles += s.tackles;
        agg._ratingSum += s.rating;
        byPlayer.set(s.playerId, agg);
      }
      return [...byPlayer.values()].map(({ _ratingSum, ...rest }) => ({
        ...rest,
        avgRating: rest.appearances ? _ratingSum / rest.appearances : 0,
      }));
    });
  }

  async getPlayer(id: string) {
    return cached(`player:${id}`, TTL, async () => {
      const player = await prisma.player.findUnique({
        where: { id },
        include: { team: true },
      });
      if (!player) return null;
      const all = await this.getPlayers({ teamId: player.teamId });
      const stats = all.find((p) => p.player.id === id);
      return {
        player: {
          id: player.id,
          name: player.name,
          position: player.position,
          jerseyNumber: player.jerseyNumber,
          isStar: player.isStar,
        },
        teamId: player.teamId,
        appearances: stats?.appearances ?? 0,
        minutes: stats?.minutes ?? 0,
        goals: stats?.goals ?? 0,
        assists: stats?.assists ?? 0,
        shots: stats?.shots ?? 0,
        tackles: stats?.tackles ?? 0,
        avgRating: stats?.avgRating ?? 0,
        team: toTeamRef(player.team),
      };
    });
  }

  async getMatches(opts?: {
    tournamentId?: string;
    teamId?: string;
  }): Promise<NormalizedMatch[]> {
    return cached(
      `matches:${opts?.tournamentId ?? "all"}:${opts?.teamId ?? "all"}`,
      TTL,
      async () => {
        const matches = await prisma.match.findMany({
          where: {
            tournamentId: opts?.tournamentId,
            ...(opts?.teamId
              ? {
                  OR: [
                    { homeTeamId: opts.teamId },
                    { awayTeamId: opts.teamId },
                  ],
                }
              : {}),
          },
          include: matchInclude,
          orderBy: { date: "asc" },
        });
        return matches.map(toNormalizedMatch);
      },
    );
  }

  async getMatch(id: string): Promise<NormalizedMatch | null> {
    return cached(`match:${id}`, TTL, async () => {
      const m = await prisma.match.findUnique({
        where: { id },
        include: matchInclude,
      });
      return m ? toNormalizedMatch(m) : null;
    });
  }

  async getTeamTournamentStats(
    teamId: string,
    tournamentId: string,
  ): Promise<TeamTournamentStats | null> {
    return cached(
      `teamstats:${teamId}:${tournamentId}`,
      TTL,
      async () => {
        const matches = await this.getMatches({ tournamentId, teamId });
        if (matches.length === 0) return null;

        let won = 0;
        let drawn = 0;
        let lost = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        let cleanSheets = 0;
        let possSum = 0;
        let possCount = 0;
        let bestStageIdx = -1;

        const stageRank = [
          "GROUP",
          "ROUND_OF_16",
          "QUARTER_FINAL",
          "SEMI_FINAL",
          "THIRD_PLACE",
          "FINAL",
        ];

        for (const m of matches) {
          const isHome = m.homeTeam.id === teamId;
          const mine = isHome ? m.homeScore : m.awayScore;
          const theirs = isHome ? m.awayScore : m.homeScore;
          goalsFor += mine;
          goalsAgainst += theirs;
          if (theirs === 0) cleanSheets += 1;
          if (mine > theirs) won += 1;
          else if (mine < theirs) lost += 1;
          else drawn += 1;
          const st = isHome ? m.homeStats : m.awayStats;
          if (st) {
            possSum += st.possession;
            possCount += 1;
          }
          const idx = stageRank.indexOf(m.stage);
          if (idx > bestStageIdx) bestStageIdx = idx;
        }

        // "Best finish": FINAL win → Champions, FINAL loss → Runners-up,
        // THIRD_PLACE win → Third place, otherwise the furthest stage.
        let bestFinish = "Group Stage";
        const lastMatch = matches[matches.length - 1];
        const lastIsHome = lastMatch?.homeTeam.id === teamId;
        const lastMine = lastMatch
          ? lastIsHome
            ? lastMatch.homeScore
            : lastMatch.awayScore
          : 0;
        const lastTheirs = lastMatch
          ? lastIsHome
            ? lastMatch.awayScore
            : lastMatch.homeScore
          : 0;
        const lastWon = lastMine > lastTheirs;
        if (lastMatch?.stage === "FINAL") {
          bestFinish = lastWon ? "Champions" : "Runners-up";
        } else if (lastMatch?.stage === "THIRD_PLACE") {
          bestFinish = lastWon ? "Third place" : "Fourth place";
        } else if (bestStageIdx >= 0) {
          bestFinish =
            {
              ROUND_OF_16: "Round of 16",
              QUARTER_FINAL: "Quarter-final",
              SEMI_FINAL: "Semi-final",
            }[stageRank[bestStageIdx]] ?? "Group Stage";
        }

        return {
          played: matches.length,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          cleanSheets,
          avgPossession: possCount ? Math.round(possSum / possCount) : 50,
          bestFinish,
        };
      },
    );
  }
}
