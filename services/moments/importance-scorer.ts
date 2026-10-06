import type {
  NormalizedMatch,
  ScoredMoment,
} from "@/types";

/**
 * Moment Importance Engine
 *
 * Scores match events and match results on a 0–100 scale so the recap
 * surfaces the moments that *mattered* — not every event that happened.
 *
 * Scoring model:
 *   base(event type)
 *   + situational modifiers (winning goal, equalizer, late drama,
 *     star player, upsets)
 *   × stage multiplier (knockout rounds amplify importance)
 *   clamped to [0, 100]
 */

const BASE_SCORES: Record<string, number> = {
  GOAL: 50,
  PENALTY_GOAL: 58,
  PENALTY_MISS: 42,
  OWN_GOAL: 46,
  RED_CARD: 44,
  YELLOW_CARD: 12,
  SUBSTITUTION: 5,
};

const STAGE_MULTIPLIERS: Record<string, number> = {
  GROUP: 1.0,
  ROUND_OF_16: 1.1,
  QUARTER_FINAL: 1.18,
  SEMI_FINAL: 1.3,
  THIRD_PLACE: 1.25,
  FINAL: 1.45,
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

interface TeamSnapshot {
  id: string;
  name: string;
  fifaRanking: number | null;
}

function scoreEvent(
  match: NormalizedMatch,
  eventIndex: number,
  focusTeamId: string | null,
  starPlayerIds: Set<string>,
): ScoredMoment | null {
  const event = match.events[eventIndex];
  const base = BASE_SCORES[event.type];
  if (base === undefined) return null;

  let score = base;
  const isGoal =
    event.type === "GOAL" ||
    event.type === "PENALTY_GOAL" ||
    event.type === "OWN_GOAL";

  // Simulate the scoreline immediately after this event by replaying
  // prior goal events.
  let home = 0;
  let away = 0;
  for (let i = 0; i <= eventIndex; i++) {
    const e = match.events[i];
    const eIsGoal =
      e.type === "GOAL" || e.type === "PENALTY_GOAL" || e.type === "OWN_GOAL";
    if (!eIsGoal) continue;
    // Own goals count for the *other* team.
    let scoringTeam = e.teamId;
    if (e.type === "OWN_GOAL") {
      scoringTeam =
        e.teamId === match.homeTeam.id ? match.awayTeam.id : match.homeTeam.id;
    }
    if (scoringTeam === match.homeTeam.id) home++;
    else if (scoringTeam === match.awayTeam.id) away++;
  }

  const teamSide =
    event.teamId === match.homeTeam.id
      ? "home"
      : event.teamId === match.awayTeam.id
        ? "away"
        : null;
  const effectiveSide =
    event.type === "OWN_GOAL"
      ? teamSide === "home"
        ? "away"
        : "home"
      : teamSide;
  const myGoals = effectiveSide === "home" ? home : away;
  const theirGoals = effectiveSide === "home" ? away : home;

  if (isGoal && effectiveSide) {
    // Winning goal: scoring while level or behind, and this team won.
    const finalMine =
      effectiveSide === "home" ? match.homeScore : match.awayScore;
    const finalTheirs =
      effectiveSide === "home" ? match.awayScore : match.homeScore;
    const teamWon = finalMine > finalTheirs;
    const wentAhead = myGoals - theirGoals === 1;
    const equalized = myGoals === theirGoals;

    if (teamWon && wentAhead) score += 24;
    else if (equalized) score += 14;

    // Late drama
    if (event.minute >= 85) score += 20;
    else if (event.minute >= 75) score += 12;
    else if (event.minute >= 60) score += 4;
  }

  if (event.type === "RED_CARD") {
    // Red cards matter more when matches are close
    const diff = Math.abs(home - away);
    if (diff <= 1) score += 10;
    if (match.stage !== "GROUP") score += 6;
  }

  if (event.playerId && starPlayerIds.has(event.playerId)) score += 8;

  // Focus-team moments get a nudge — this is *their* story.
  if (focusTeamId && event.teamId === focusTeamId) score += 6;

  score *= STAGE_MULTIPLIERS[match.stage] ?? 1;

  const scoreline = `${match.homeTeam.shortName} ${home}–${away} ${match.awayTeam.shortName}`;
  return {
    matchId: match.id,
    minute: event.minute,
    title: eventTitle(event.type, event.playerName, event.minute),
    description: event.description,
    importanceScore: clamp(score),
    playerId: event.playerId,
    playerName: event.playerName,
    teamName:
      event.teamId === match.homeTeam.id
        ? match.homeTeam.name
        : event.teamId === match.awayTeam.id
          ? match.awayTeam.name
          : null,
    eventType: event.type,
    scoreline,
    stage: match.stage,
  };
}

function eventTitle(
  type: string,
  playerName: string | null,
  minute: number,
): string {
  const who = playerName ?? "Unknown";
  switch (type) {
    case "GOAL":
      return `${who} scores (${minute}')`;
    case "PENALTY_GOAL":
      return `${who} converts from the spot (${minute}')`;
    case "PENALTY_MISS":
      return `${who} misses a penalty (${minute}')`;
    case "OWN_GOAL":
      return `Own goal drama (${minute}')`;
    case "RED_CARD":
      return `${who} sent off (${minute}')`;
    case "YELLOW_CARD":
      return `${who} booked (${minute}')`;
    default:
      return `${minute}'`;
  }
}

/** Score a *result-level* moment — upsets, knockout wins, titles. */
function scoreResult(
  match: NormalizedMatch,
  focusTeamId: string | null,
): ScoredMoment | null {
  const focusIsHome = match.homeTeam.id === focusTeamId;
  const focusIsAway = match.awayTeam.id === focusTeamId;
  if (focusTeamId && !focusIsHome && !focusIsAway) return null;

  const focus: TeamSnapshot | null = focusTeamId
    ? focusIsHome
      ? match.homeTeam
      : match.awayTeam
    : null;
  const opponent: TeamSnapshot | null = focusTeamId
    ? focusIsHome
      ? match.awayTeam
      : match.homeTeam
    : null;

  const focusScore = focusIsHome ? match.homeScore : match.awayScore;
  const oppScore = focusIsHome ? match.awayScore : match.homeScore;
  const won = focus ? focusScore > oppScore : match.homeScore !== match.awayScore;
  const wonOnPens =
    match.homePenalties != null &&
    match.awayPenalties != null &&
    (focusIsHome
      ? match.homePenalties > match.awayPenalties
      : match.awayPenalties > match.homePenalties);

  let score = 0;
  let title = "";
  let description = "";

  // Major upset: big ranking gap beaten
  if (focus && opponent && won) {
    const gap = (focus.fifaRanking ?? 50) - (opponent.fifaRanking ?? 50);
    if (gap >= 20) {
      score = 84;
      title = `${focus.name} stun ${opponent.name}`;
      description = `Ranked ${focus.fifaRanking} in the world, ${focus.name} defeated ${opponent.name} ${focusScore}–${oppScore} in one of the tournament's great upsets.`;
    }
  }

  if (focus && won && match.stage === "FINAL") {
    score = 96;
    title = `${focus.name} are world champions`;
    description = `${focus.name} won the World Cup final ${focusScore}–${oppScore}.`;
  } else if (focus && won && match.stage === "THIRD_PLACE") {
    score = 82;
    title = `${focus.name} take bronze`;
    description = `${focus.name} claimed third place with a ${focusScore}–${oppScore} win over ${opponent?.name}.`;
  } else if (focus && won && match.stage === "SEMI_FINAL") {
    score = 80;
    title = `${focus.name} reach the final`;
    description = `${focus.name} beat ${opponent?.name} to book a place in the World Cup final.`;
  } else if (focus && won && (wonOnPens || match.homeScore === match.awayScore)) {
    score = 78;
    title = `Penalty shootout drama`;
    description = `${match.homeTeam.shortName} ${match.homeScore}–${match.awayScore} ${match.awayTeam.shortName} — decided from the spot (${match.homePenalties}–${match.awayPenalties}).`;
  }

  if (score === 0) return null;
  return {
    matchId: match.id,
    minute: null,
    title,
    description,
    importanceScore: clamp(score),
    playerId: null,
    playerName: null,
    teamName: focus?.name ?? null,
    eventType: "RESULT",
    scoreline: `${match.homeTeam.shortName} ${match.homeScore}–${match.awayScore} ${match.awayTeam.shortName}`,
    stage: match.stage,
  };
}

export interface ScoreOptions {
  focusTeamId?: string | null;
  starPlayerIds?: string[];
  /** Only return moments at or above this score */
  threshold?: number;
  limit?: number;
}

/**
 * Scores every event + notable result across the given matches and
 * returns the ranked moments, highest importance first.
 */
export function scoreMoments(
  matches: NormalizedMatch[],
  opts: ScoreOptions = {},
): ScoredMoment[] {
  const { focusTeamId = null, starPlayerIds = [], threshold = 40, limit } = opts;
  const stars = new Set(starPlayerIds);
  const moments: ScoredMoment[] = [];

  for (const match of matches) {
    const sorted = [...match.events].sort((a, b) => a.minute - b.minute);
    const orderedMatch = { ...match, events: sorted };
    for (let i = 0; i < sorted.length; i++) {
      const m = scoreEvent(orderedMatch, i, focusTeamId, stars);
      if (m) moments.push(m);
    }
    const r = scoreResult(match, focusTeamId ?? null);
    if (r) moments.push(r);
  }

  const filtered = moments
    .filter((m) => m.importanceScore >= threshold)
    .sort((a, b) => b.importanceScore - a.importanceScore);

  return limit ? filtered.slice(0, limit) : filtered;
}
