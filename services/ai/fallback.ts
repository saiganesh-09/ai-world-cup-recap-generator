import type { RecapContext } from "@/types/domain";
import type { RecapStory } from "./schemas";

// ── Deterministic fallback generator ────────────────────────
// Produces a structured RecapStory without any LLM call. Keeps the
// product fully functional when OPENAI_API_KEY is absent or the API
// fails — the same schema guarantees identical downstream behavior.

const STAGE_LABEL: Record<string, string> = {
  GROUP: "group stage",
  ROUND_OF_16: "round of 16",
  QUARTER_FINAL: "quarter-finals",
  SEMI_FINAL: "semi-finals",
  THIRD_PLACE: "third-place playoff",
  FINAL: "final",
};

function stageSentence(ctx: RecapContext): string {
  const s = ctx.focusTeam?.stats;
  if (!s) return "";
  if (s.champion) return "lifting the trophy as world champions";
  if (s.furthestStage === "FINAL") return "falling just short in the final";
  if (s.furthestStage && s.furthestStage !== "GROUP") {
    return `reaching the ${STAGE_LABEL[s.furthestStage] ?? s.furthestStage.toLowerCase()}`;
  }
  return "exiting in the group stage";
}

export function generateFallbackStory(ctx: RecapContext): RecapStory {
  const team = ctx.focusTeam;
  const teamName = team?.name ?? ctx.tournament.name;
  const s = team?.stats;
  const top = ctx.topPlayers.slice(0, 4);
  const topMoments = ctx.moments.slice(0, 5);
  const scorer = ctx.topPlayers.find((p) => p.goals > 0) ?? ctx.topPlayers[0];

  const record = s ? `${s.wins} win${s.wins === 1 ? "" : "s"}, ${s.draws} draw${s.draws === 1 ? "" : "s"} and ${s.losses} defeat${s.losses === 1 ? "" : "s"}` : "";
  const goals = s ? `${s.goalsFor} goals scored and ${s.goalsAgainst} conceded` : "";

  const storyParts: string[] = [];
  if (s) {
    storyParts.push(
      `${teamName}'s ${ctx.tournament.name} campaign ended with ${teamName} ${stageSentence(ctx)}.`,
      `Across ${s.played} matches they recorded ${record}, with ${goals} and ${s.cleanSheets} clean sheet${s.cleanSheets === 1 ? "" : "s"}.`,
    );
  }
  if (topMoments.length) {
    storyParts.push(
      `The defining stretch came through moments like ${topMoments
        .slice(0, 3)
        .map((m) => m.title.toLowerCase())
        .join(", ")}.`,
    );
  }
  if (scorer) {
    storyParts.push(
      `${scorer.name} led the way with ${scorer.goals} goal${scorer.goals === 1 ? "" : "s"}${scorer.assists ? ` and ${scorer.assists} assist${scorer.assists === 1 ? "" : "s"}` : ""}, averaging a ${scorer.avgRating.toFixed(1)} rating.`,
    );
  }

  const title =
    ctx.preferences.type === "PLAYER_JOURNEY" && ctx.focusPlayer
      ? `${ctx.focusPlayer.name}'s ${ctx.tournament.name} Story`
      : `${teamName}'s ${ctx.tournament.year} World Cup Journey`;

  return {
    title,
    shortSummary: `${teamName} at ${ctx.tournament.name}: ${record || "a memorable run"} — ${stageSentence(ctx)}.`,
    tournamentStory: storyParts.join(" "),
    biggestMoments: topMoments.map((m) => `${m.title} — ${m.description}`),
    keyPlayers: top.map((p) => ({
      name: p.name,
      note: `${p.goals}G / ${p.assists}A in ${p.appearances} apps, ${p.avgRating.toFixed(1)} avg rating`,
    })),
    turningPoints: ctx.moments
      .filter((m) => m.importanceScore >= 60)
      .slice(0, 3)
      .map((m) => m.description),
    statisticsHighlights: [
      s ? `${s.goalsFor} goals in ${s.played} matches (${(s.goalsFor / Math.max(1, s.played)).toFixed(1)} per game)` : "",
      s ? `${s.cleanSheets} clean sheet${s.cleanSheets === 1 ? "" : "s"}, ${s.avgPossession}% average possession` : "",
      scorer ? `Top scorer: ${scorer.name} (${scorer.goals})` : "",
      s ? `Record: ${s.wins}W-${s.draws}D-${s.losses}L` : "",
    ].filter(Boolean),
    finalVerdict: s?.champion
      ? `${teamName} conquered ${ctx.tournament.country} — champions, and deserving ones.`
      : `${teamName}'s ${ctx.tournament.name} journey was defined by ${topMoments[0]?.title.toLowerCase() ?? "fine margins"} — a campaign to remember.`,
  };
}
