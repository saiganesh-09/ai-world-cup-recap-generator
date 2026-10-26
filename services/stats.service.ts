import type { MatchStage } from "@prisma/client";
import type {
  NormalizedMatch,
  NormalizedPlayerStat,
  NormalizedTeamStat,
} from "@/types/domain";
import type { MatchWithContext } from "./sports/provider";

const STAGE_ORDER: MatchStage[] = [
  "GROUP",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

export function matchResult(
  m: { homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number; homePenScore: number | null; awayPenScore: number | null },
  teamId: string,
): "W" | "D" | "L" {
  const isHome = m.homeTeamId === teamId;
  const gf = isHome ? m.homeScore : m.awayScore;
  const ga = isHome ? m.awayScore : m.homeScore;
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  // Draw → check shootout
  if (m.homePenScore != null && m.awayPenScore != null) {
    const pf = isHome ? m.homePenScore : m.awayPenScore;
    const pa = isHome ? m.awayPenScore : m.homePenScore;
    return pf > pa ? "W" : "L";
  }
  return "D";
}

export function stageRank(stage: MatchStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function teamStats(
  matches: MatchWithContext[],
  teamId: string,
): NormalizedTeamStat {
  let wins = 0,
    draws = 0,
    losses = 0,
    goalsFor = 0,
    goalsAgainst = 0,
    cleanSheets = 0,
    totalShots = 0,
    possessionSum = 0,
    possessionN = 0,
    furthest: MatchStage | null = null;

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const gf = isHome ? m.homeScore : m.awayScore;
    const ga = isHome ? m.awayScore : m.homeScore;
    goalsFor += gf;
    goalsAgainst += ga;
    if (ga === 0) cleanSheets++;
    const r = matchResult(m, teamId);
    if (r === "W") wins++;
    else if (r === "D") draws++;
    else losses++;
    if (!furthest || stageRank(m.stage) > stageRank(furthest)) furthest = m.stage;
    const ts = m.teamStats?.find((s) => s.teamId === teamId);
    if (ts) {
      totalShots += ts.shots;
      possessionSum += ts.possession;
      possessionN++;
    }
  }

  // Champion = won the final
  const final = matches.find((m) => m.stage === "FINAL");
  const champion = !!final && matchResult(final, teamId) === "W";

  return {
    played: matches.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    avgPossession: possessionN ? Math.round((possessionSum / possessionN) * 10) / 10 : 50,
    totalShots,
    cleanSheets,
    furthestStage: furthest,
    champion,
  };
}

export function playerStats(
  matchStats: {
    minutes: number;
    goals: number;
    assists: number;
    shots: number;
    tackles: number;
    rating: number;
    player: { id: string; name: string; position: import("@prisma/client").Position; jerseyNumber: number };
  }[],
): NormalizedPlayerStat[] {
  const byPlayer = new Map<string, NormalizedPlayerStat & { ratingSum: number }>();
  for (const s of matchStats) {
    let agg = byPlayer.get(s.player.id);
    if (!agg) {
      agg = {
        playerId: s.player.id,
        name: s.player.name,
        position: s.player.position,
        jerseyNumber: s.player.jerseyNumber,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        tackles: 0,
        avgRating: 0,
        ratingSum: 0,
      };
      byPlayer.set(s.player.id, agg);
    }
    agg.appearances++;
    agg.minutes += s.minutes;
    agg.goals += s.goals;
    agg.assists += s.assists;
    agg.shots += s.shots;
    agg.tackles += s.tackles;
    agg.ratingSum += s.rating;
  }
  return [...byPlayer.values()]
    .map((p) => ({ ...p, avgRating: Math.round((p.ratingSum / p.appearances) * 100) / 100 }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.avgRating - a.avgRating);
}

export function normalizeMatch(
  m: MatchWithContext,
  focusTeamId?: string,
): NormalizedMatch {
  return {
    id: m.id,
    date: m.date.toISOString(),
    venue: m.venue,
    stage: m.stage,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenScore: m.homePenScore,
    awayPenScore: m.awayPenScore,
    result: focusTeamId ? matchResult(m, focusTeamId) : null,
    events: m.events.map((e) => ({
      minute: e.minute,
      extraMinute: e.extraMinute,
      type: e.type,
      playerName: e.player?.name ?? null,
      teamName: e.team?.name ?? "",
      detail: e.detail,
      description: e.description,
    })),
  };
}
