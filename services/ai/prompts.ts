import type {
  RecapContext,
  RecapPreferences,
  ScoredMoment,
} from "@/types";
import { RECAP_TYPE_LABELS, TONE_LABELS, STAGE_LABELS } from "@/lib/utils";

/**
 * Prompt construction. The model receives *normalized, structured*
 * tournament data — never raw API dumps — so it can narrate but not
 * invent statistics.
 */
export function buildRecapPrompt(
  ctx: RecapContext,
  prefs: RecapPreferences,
  moments: ScoredMoment[],
): { system: string; user: string } {
  const system = [
    "You are a world-class football storyteller writing personalized World Cup recaps.",
    "RULES:",
    "- Use ONLY the data provided. Never invent statistics, scores, scorers, or events.",
    "- Every number you state must come from the provided data.",
    "- Write vivid, broadcast-quality prose appropriate to the requested tone.",
    "- Return ONLY valid JSON matching the requested schema. No markdown fences.",
  ].join("\n");

  const matchLines = ctx.matches.map((m) => {
    const goals = m.events
      .filter((e) =>
        ["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(e.type),
      )
      .map(
        (e) =>
          `${e.minute}' ${e.playerName ?? "?"}${e.teamId === m.homeTeam.id ? ` (${m.homeTeam.shortName})` : ` (${m.awayTeam.shortName})`}`,
      )
      .join("; ");
    const pens =
      m.homePenalties != null
        ? ` — ${m.homePenalties}–${m.awayPenalties} on penalties`
        : "";
    return `- ${STAGE_LABELS[m.stage]} | ${m.homeTeam.name} ${m.homeScore}–${m.awayScore} ${m.awayTeam.name}${pens} | ${m.venue} | goals: ${goals || "none"}`;
  });

  const momentLines = moments.slice(0, 8).map(
    (m) =>
      `- [importance ${m.importanceScore}] ${m.title} — ${m.description} (${m.scoreline})`,
  );

  const playerLines = ctx.playerStats
    .sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating)
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.player.name} (${p.player.position}): ${p.goals}G ${p.assists}A, ${p.appearances} apps, ${p.avgRating.toFixed(1)} rating`,
    );

  const ts = ctx.teamStats;
  const user = `TOURNAMENT: ${ctx.tournament.name} (${ctx.tournament.year}), hosted in ${ctx.tournament.hostCountry}

FOCUS: ${
    ctx.focusPlayer
      ? `Player ${ctx.focusPlayer.name} of ${ctx.focusPlayer.team.name}`
      : ctx.focusTeam
        ? `Team ${ctx.focusTeam.name} (FIFA rank ${ctx.focusTeam.fifaRanking ?? "n/a"})`
        : "Whole tournament"
  }
RECAP TYPE: ${RECAP_TYPE_LABELS[prefs.type]}
TONE: ${TONE_LABELS[prefs.tone]}

TEAM AGGREGATE: ${
    ts
      ? `${ts.played} played, ${ts.won}W ${ts.drawn}D ${ts.lost}L, ${ts.goalsFor} scored, ${ts.goalsAgainst} conceded, ${ts.cleanSheets} clean sheets, ${ts.avgPossession}% avg possession, best finish: ${ts.bestFinish}`
      : "n/a"
  }

MATCHES (chronological):
${matchLines.join("\n")}

TOP MOMENTS (pre-scored by importance, 0-100):
${momentLines.join("\n")}

KEY PLAYER STATS:
${playerLines.join("\n")}

TASK: Write a ${TONE_LABELS[prefs.tone].toLowerCase()}-toned ${RECAP_TYPE_LABELS[prefs.type]} recap.

Return JSON with this EXACT shape:
{
  "title": "short evocative title (max 12 words)",
  "shortSummary": "2-3 sentence teaser (max 60 words)",
  "tournamentStory": "the full narrative, 3-5 paragraphs, match-by-match arc with drama",
  "biggestMoments": [{"title": "...", "description": "...", "minute": 89, "matchLabel": "IND 2–1 JPN"}],
  "keyPlayers": [{"name": "...", "note": "why they mattered"}],
  "turningPoints": [{"title": "...", "description": "..."}],
  "statisticsHighlights": [{"label": "...", "value": "...", "note": "optional context"}],
  "finalVerdict": "2-3 sentence closing verdict on the campaign"
}

Constraints: biggestMoments 3-6 items, keyPlayers 2-4, turningPoints 1-3, statisticsHighlights 4-6. Only use players/moments/scores present in the data above.`;

  return { system, user };
}
