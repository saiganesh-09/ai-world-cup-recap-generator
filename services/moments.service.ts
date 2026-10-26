import type { MatchStage } from "@prisma/client";
import type { NormalizedMoment } from "@/types/domain";
import { matchResult } from "./stats.service";
import type { MatchWithContext } from "./sports/provider";

// ── Moment Importance Engine ────────────────────────────────
// Scores every candidate moment 0–100 using weighted signals:
// event type, match stage, timing (late goals), game state impact
// (winner/equalizer), shootout drama, upsets, milestones.
// The recap keeps only the highest-scoring moments — quality over
// completeness.

const STAGE_WEIGHT: Record<MatchStage, number> = {
  GROUP: 0,
  ROUND_OF_16: 8,
  QUARTER_FINAL: 14,
  SEMI_FINAL: 20,
  THIRD_PLACE: 8,
  FINAL: 28,
};

const BASE_SCORE: Record<string, number> = {
  GOAL: 30,
  PENALTY_GOAL: 34,
  PENALTY_MISS: 36,
  OWN_GOAL: 30,
  RED_CARD: 32,
  YELLOW_CARD: 8,
  SUBSTITUTION: 5,
  MILESTONE: 45,
};

interface ScoreContext {
  focusTeamId?: string;
  focusPlayerId?: string;
}

/**
 * Reconstruct the scoreline after each event so we can detect
 * winners/equalizers. Events must be sorted by minute.
 */
function scoreEvent(
  m: MatchWithContext,
  e: MatchWithContext["events"][number],
  running: { home: number; away: number },
  ctx: ScoreContext,
): { score: number; label: string; description: string } {
  const stageW = STAGE_WEIGHT[m.stage];
  const minute = e.minute + (e.extraMinute ? e.extraMinute / 100 : 0);
  const isGoal = ["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(e.type);
  const player = e.player?.name;
  const teamName = e.team?.name ?? "Unknown";
  const isFocusTeam = ctx.focusTeamId ? e.teamId === ctx.focusTeamId : true;
  const isFocusPlayer = ctx.focusPlayerId ? e.playerId === ctx.focusPlayerId : true;

  // Relevance dampener: moments not involving the chosen team/player
  // still count, but less.
  const relevance = isFocusTeam && isFocusPlayer ? 1 : 0.45;

  if (isGoal) {
    const forHome = e.teamId === m.homeTeamId;
    const ownGoal = e.type === "OWN_GOAL";
    if (ownGoal) {
      if (forHome) running.away++; else running.home++;
    } else {
      if (forHome) running.home++; else running.away++;
    }
    const { home, away } = running;
    const diff = Math.abs(home - away);
    let bonus = 0;
    let tag = "Goal";

    // Game-state analysis from the *scoring* team's perspective.
    const leadAfter = forHome ? home - away : away - home;
    if (leadAfter === 0) {
      bonus += 16;
      tag = "Equalizer";
    } else if (leadAfter === 1 && diff === 1) {
      bonus += 10; // go-ahead goal
      tag = "Go-ahead goal";
    }
    if (minute >= 80) {
      bonus += 14;
      tag = leadAfter === 0 ? "Late equalizer" : "Late goal";
    }
    if (minute >= 90) bonus += 8;
    if (e.type === "PENALTY_GOAL") bonus += 2;
    if (e.detail?.toLowerCase().includes("bicycle") || e.detail?.toLowerCase().includes("volley") || e.detail?.toLowerCase().includes("free kick")) {
      bonus += 6;
      tag = e.detail;
    }
    if (e.playerId && ctx.focusPlayerId === e.playerId) bonus += 12;

    const score = Math.round((BASE_SCORE.GOAL + stageW + bonus) * relevance);
    const label = player
      ? `${player} ${tag.toLowerCase()} ${minuteFmt(e)}`
      : `${teamName} ${tag.toLowerCase()} ${minuteFmt(e)}`;
    return {
      score: Math.min(100, score),
      label,
      description:
        e.description ??
        `${teamName} ${leadAfter === 0 ? "draw level" : leadAfter > 0 ? "take the lead" : "pull one back"} at ${running.home}-${running.away}`,
    };
  }

  const base = BASE_SCORE[e.type] ?? 10;
  let bonus = 0;
  let label = e.type.replace(/_/g, " ").toLowerCase();
  if (e.type === "MILESTONE") {
    bonus += m.stage === "FINAL" ? 18 : 6;
    label = e.description?.split(".")[0] ?? "Key moment";
  }
  if (e.type === "PENALTY_MISS") {
    bonus += minute >= 80 ? 12 : 4;
    label = player ? `${player} misses a penalty` : "Penalty miss";
  }
  if (e.type === "RED_CARD") {
    bonus += minute < 60 ? 8 : 0;
    label = player ? `${player} sent off` : "Red card";
  }
  if (minute >= 80 && e.type !== "YELLOW_CARD") bonus += 6;

  const score = Math.round((base + stageW + bonus) * relevance);
  return {
    score: Math.min(100, score),
    label,
    description: e.description ?? `${label} ${minuteFmt(e)}`,
  };
}

function minuteFmt(e: { minute: number; extraMinute: number | null }) {
  return e.extraMinute ? `(${e.minute}+${e.extraMinute}')` : `(${e.minute}')`;
}

/** Shootout results are themselves huge moments. */
function shootoutMoment(m: MatchWithContext, ctx: ScoreContext): NormalizedMoment | null {
  if (m.homePenScore == null || m.awayPenScore == null) return null;
  const winner = m.homePenScore > m.awayPenScore ? m.homeTeam : m.awayTeam;
  const loser = winner.id === m.homeTeamId ? m.awayTeam : m.homeTeam;
  const score = Math.min(
    100,
    Math.round((70 + STAGE_WEIGHT[m.stage]) * (ctx.focusTeamId && winner.id !== ctx.focusTeamId ? 0.6 : 1)),
  );
  return {
    matchId: m.id,
    playerId: null,
    playerName: null,
    teamRef: winner.shortName,
    minute: 120,
    title: `${winner.name} win on penalties`,
    description: `${winner.name} beat ${loser.name} ${Math.max(m.homePenScore, m.awayPenScore)}-${Math.min(m.homePenScore, m.awayPenScore)} in a shootout${m.stage === "FINAL" ? " to win the World Cup" : ""}`,
    importanceScore: score,
  };
}

/** Result-level moments: upsets, big wins, elimination, title. */
function resultMoments(m: MatchWithContext, ctx: ScoreContext): NormalizedMoment[] {
  const out: NormalizedMoment[] = [];
  if (!ctx.focusTeamId) return out;
  const r = matchResult(m, ctx.focusTeamId);
  const opp = m.homeTeamId === ctx.focusTeamId ? m.awayTeam : m.homeTeam;
  const gf = m.homeTeamId === ctx.focusTeamId ? m.homeScore : m.awayScore;
  const ga = m.homeTeamId === ctx.focusTeamId ? m.awayScore : m.homeScore;

  // Big-margin win (4+ goals)
  if (r === "W" && gf - ga >= 4) {
    out.push({
      matchId: m.id, playerId: null, playerName: null, teamRef: "", minute: 90,
      title: `Statement win over ${opp.name}`,
      description: `A ${gf}-${ga} demolition of ${opp.name} — one of the biggest wins of the tournament`,
      importanceScore: Math.min(100, 55 + STAGE_WEIGHT[m.stage]),
    });
  }
  // Elimination / progression
  if (m.stage !== "GROUP" && m.stage !== "THIRD_PLACE") {
    if (r === "W" && m.stage === "FINAL") {
      out.push({
        matchId: m.id, playerId: null, playerName: null, teamRef: "", minute: 120,
        title: "World Champions",
        description: `${m.stage === "FINAL" ? "Won the World Cup final" : ""} against ${opp.name}`,
        importanceScore: 100,
      });
    } else if (r === "L" && m.stage === "FINAL") {
      out.push({
        matchId: m.id, playerId: null, playerName: null, teamRef: "", minute: 120,
        title: "Runners-up",
        description: `Lost the final to ${opp.name} — a campaign to be proud of`,
        importanceScore: 88,
      });
    } else if (r === "L") {
      const stageName: Partial<Record<MatchStage, string>> = {
        ROUND_OF_16: "round of 16",
        QUARTER_FINAL: "quarter-finals",
        SEMI_FINAL: "semi-finals",
      };
      out.push({
        matchId: m.id, playerId: null, playerName: null, teamRef: "", minute: 90,
        title: `Eliminated in the ${stageName[m.stage] ?? "knockouts"}`,
        description: `The run ended against ${opp.name}`,
        importanceScore: 60,
      });
    }
  }
  return out;
}

export function computeMoments(
  matches: MatchWithContext[],
  ctx: ScoreContext = {},
  limit = 8,
): NormalizedMoment[] {
  const moments: NormalizedMoment[] = [];

  for (const m of matches) {
    const running = { home: 0, away: 0 };
    const sorted = [...m.events].sort(
      (a, b) => a.minute + (a.extraMinute ?? 0) / 100 - (b.minute + (b.extraMinute ?? 0) / 100),
    );
    for (const e of sorted) {
      if (e.type === "SUBSTITUTION" || e.type === "YELLOW_CARD") continue; // noise
      const { score, label, description } = scoreEvent(m, e, running, ctx);
      if (score < 25) continue; // filter low-signal events entirely
      moments.push({
        matchId: m.id,
        playerId: e.playerId,
        playerName: e.player?.name ?? null,
        teamRef: e.team?.shortName ?? "",
        minute: e.minute,
        title: label,
        description,
        importanceScore: score,
      });
    }
    const so = shootoutMoment(m, ctx);
    if (so) moments.push(so);
    moments.push(...resultMoments(m, ctx));
  }

  // Deduplicate near-identical moments (same match+minute+player)
  const seen = new Set<string>();
  return moments
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .filter((mo) => {
      const key = `${mo.matchId}:${mo.minute}:${mo.playerId}:${mo.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((mo, i) => ({ ...mo, order: i }));
}
