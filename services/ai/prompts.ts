import type { RecapContext } from "@/types/domain";

// Prompt construction: the model receives only normalized, relevant
// data — never raw dumps — which keeps output factual and grounded.

const TONE_INSTRUCTIONS: Record<string, string> = {
  EXCITING: "Write with high energy and drama. Short punchy sentences. Make the reader feel the stadium roar.",
  EMOTIONAL: "Write with warmth and emotional depth. Focus on what the journey meant to players and fans.",
  PROFESSIONAL: "Write like a seasoned analyst: measured, precise, authoritative.",
  STATISTICAL: "Lead with numbers. Every claim should be backed by the provided statistics.",
  COMMENTARY: "Write like a match commentator narrating highlights — present tense energy, vivid calls.",
};

const TYPE_INSTRUCTIONS: Record<string, string> = {
  TEAM_JOURNEY: "Tell the story of the team's tournament from first match to last.",
  PLAYER_JOURNEY: "Tell the story centered on the focus player's personal tournament.",
  TOURNAMENT_HIGHLIGHTS: "Cover the most memorable moments across the whole tournament.",
  BEST_MATCHES: "Focus on the most dramatic matches and what made them great.",
  EMOTIONAL_STORY: "Emphasize the human drama: pressure, redemption, heartbreak, triumph.",
  STATISTICAL_BREAKDOWN: "Structure the story around the numbers: goals, ratings, trends.",
};

export function buildRecapPrompt(ctx: RecapContext): { system: string; user: string } {
  const focus = ctx.focusTeam
    ? `FOCUS TEAM: ${ctx.focusTeam.name} (${ctx.focusTeam.shortName})
Record: ${ctx.focusTeam.stats.wins}W-${ctx.focusTeam.stats.draws}D-${ctx.focusTeam.stats.losses}L, ${ctx.focusTeam.stats.goalsFor} scored / ${ctx.focusTeam.stats.goalsAgainst} conceded, ${ctx.focusTeam.stats.cleanSheets} clean sheets, avg possession ${ctx.focusTeam.stats.avgPossession}%.
Furthest stage: ${ctx.focusTeam.stats.furthestStage}${ctx.focusTeam.stats.champion ? " (CHAMPIONS)" : ""}.`
    : "FOCUS: whole tournament";

  const playerFocus = ctx.focusPlayer
    ? `FOCUS PLAYER: ${ctx.focusPlayer.name} (${ctx.focusPlayer.position}, ${ctx.focusPlayer.teamName})
Stats: ${ctx.focusPlayer.stats.appearances} apps, ${ctx.focusPlayer.stats.goals} goals, ${ctx.focusPlayer.stats.assists} assists, ${ctx.focusPlayer.stats.shots} shots, avg rating ${ctx.focusPlayer.stats.avgRating}.`
    : "";

  const matches = ctx.matches
    .map(
      (m) =>
        `${m.date.slice(0, 10)} [${m.stage}] ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}` +
        (m.homePenScore != null ? ` (pens ${m.homePenScore}-${m.awayPenScore})` : ""),
    )
    .join("\n");

  const moments = ctx.moments
    .slice(0, 12)
    .map((m) => `[${m.importanceScore}/100] ${m.title} — ${m.description}`)
    .join("\n");

  const players = ctx.topPlayers
    .slice(0, 8)
    .map((p) => `${p.name}: ${p.appearances} apps, ${p.goals}G, ${p.assists}A, rating ${p.avgRating}`)
    .join("\n");

  const system = `You are an elite football storyteller producing a personalized World Cup recap.
You receive verified tournament data and must return ONLY valid JSON matching the requested schema.
Rules:
- Use ONLY facts from the provided data. Never invent matches, scores, scorers, or statistics.
- ${TONE_INSTRUCTIONS[ctx.preferences.tone] ?? TONE_INSTRUCTIONS.EXCITING}
- ${TYPE_INSTRUCTIONS[ctx.preferences.type] ?? TYPE_INSTRUCTIONS.TEAM_JOURNEY}
- Reference specific matches, minutes, players and scores from the data.
- Keep biggestMoments ordered by drama/importance.`;

  const user = `TOURNAMENT: ${ctx.tournament.name} (${ctx.tournament.country})${ctx.tournament.isDemo ? " — simulated demo tournament" : ""}

${focus}
${playerFocus}

MATCHES:
${matches}

TOP MOMENTS (pre-scored by importance engine):
${moments}

KEY PLAYER STATS:
${players}

Return JSON with keys: title, shortSummary, tournamentStory, biggestMoments (array of strings), keyPlayers (array of {name, note}), turningPoints (array of strings), statisticsHighlights (array of strings), finalVerdict.`;

  return { system, user };
}
