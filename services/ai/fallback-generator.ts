import type {
  AiRecapOutput,
  RecapContext,
  RecapPreferences,
  ScoredMoment,
} from "@/types";
import { STAGE_LABELS } from "@/lib/utils";

/**
 * Deterministic, rule-based narrative generator.
 *
 * Used when: (a) OPENAI_API_KEY is unset — demo mode, (b) the model
 * fails or returns invalid JSON — graceful degradation. Every claim it
 * makes is derived from the normalized dataset, so it can never
 * hallucinate statistics.
 */
export function generateFallbackRecap(
  ctx: RecapContext,
  prefs: RecapPreferences,
  moments: ScoredMoment[],
): AiRecapOutput {
  const team = ctx.focusTeam;
  const player = ctx.focusPlayer;
  const stats = ctx.teamStats;
  const subject = player?.name ?? team?.name ?? ctx.tournament.name;

  const wins = stats?.won ?? 0;
  const losses = stats?.lost ?? 0;
  const draws = stats?.drawn ?? 0;
  const played = stats?.played ?? ctx.matches.length;
  const gf = stats?.goalsFor ?? 0;
  const ga = stats?.goalsAgainst ?? 0;
  const finish = stats?.bestFinish ?? "Group Stage";

  const opening = player
    ? `${player.name}'s ${ctx.tournament.name} was defined by ${player.position === "FW" ? "moments of attacking quality" : "consistent, high-level performances"} for ${player.team.name}.`
    : `${subject}'s ${ctx.tournament.name} campaign delivered ${wins} ${wins === 1 ? "win" : "wins"}, ${draws} ${draws === 1 ? "draw" : "draws"} and ${losses} ${losses === 1 ? "defeat" : "defeats"} across ${played} matches, finishing with a ${finish} result.`;

  const topMoment = moments[0];
  const mid = topMoment
    ? ` The defining memory: ${topMoment.title.toLowerCase().replace(/\.$/, "")} — ${topMoment.description}`
    : "";

  const story = [
    opening + mid,
    buildJourneyParagraph(ctx),
    `In front of goal, ${subject} ${player ? "contributed" : "produced"} ${player ? playerStatsLine(ctx) : `${gf} scored and ${ga} conceded`}. ${stats ? `Possession averaged ${stats.avgPossession}% and the side kept ${stats.cleanSheets} ${stats.cleanSheets === 1 ? "clean sheet" : "clean sheets"}.` : ""}`,
  ].join("\n\n");

  const topPlayers = [...ctx.playerStats]
    .sort((a, b) => b.goals * 3 + b.assists * 2 + b.avgRating - (a.goals * 3 + a.assists * 2 + a.avgRating))
    .slice(0, 4)
    .map((p) => ({
      name: p.player.name,
      note: `${p.goals}G ${p.assists}A in ${p.appearances} apps · ${p.avgRating.toFixed(1)} avg rating`,
    }));

  const statHighlights = [
    { label: "Matches played", value: String(played) },
    { label: "Record", value: `${wins}W · ${draws}D · ${losses}L` },
    { label: "Goals", value: `${gf} for / ${ga} against` },
    ...(stats
      ? [
          { label: "Clean sheets", value: String(stats.cleanSheets) },
          { label: "Avg possession", value: `${stats.avgPossession}%` },
          { label: "Best finish", value: stats.bestFinish },
        ]
      : []),
  ];

  const verdict =
    finish === "Champions"
      ? `${subject} didn't just participate — they conquered. A World Cup campaign for the history books.`
      : finish === "Final" || finish === "Runners-up"
        ? `${subject} came within touching distance of immortality. A campaign to remember, and a foundation to build on.`
        : finish === "Third place" || finish === "Semi-final"
          ? `${subject} announced themselves on the world stage. Deep runs like this change a footballing nation forever.`
          : `${subject}'s tournament had its moments of magic. The story continues at the next World Cup.`;

  return toneAdjust(
    {
      title:
        prefs.type === "PLAYER_JOURNEY" && player
          ? `${player.name}: ${ctx.tournament.name} Story`
          : `${subject} — ${ctx.tournament.name} Recap`,
      shortSummary: `A personalized AI recap of ${subject}'s ${ctx.tournament.name}: ${wins} wins, a ${finish} finish, and the moments that defined the run.`,
      tournamentStory: story,
      biggestMoments: moments.slice(0, 5).map((m) => ({
        title: m.title,
        description: m.description,
        ...(m.minute != null ? { minute: m.minute } : {}),
        matchLabel: m.scoreline,
      })),
      keyPlayers: topPlayers.length
        ? topPlayers
        : [{ name: subject, note: "Tournament focus" }],
      turningPoints: buildTurningPoints(ctx, moments),
      statisticsHighlights: statHighlights,
      finalVerdict: verdict,
    },
    prefs,
  );
}

function playerStatsLine(ctx: RecapContext): string {
  const p = ctx.focusPlayer;
  if (!p) return "";
  const s = ctx.playerStats.find((x) => x.player.id === p.id);
  if (!s) return "valuable minutes";
  return `${s.goals} ${s.goals === 1 ? "goal" : "goals"} and ${s.assists} ${s.assists === 1 ? "assist" : "assists"} in ${s.appearances} appearances (avg rating ${s.avgRating.toFixed(1)})`;
}

function buildJourneyParagraph(ctx: RecapContext): string {
  if (ctx.matches.length === 0) return "";
  const lines = ctx.matches.map((m) => {
    const focusIsHome = ctx.focusTeam && m.homeTeam.id === ctx.focusTeam.id;
    const focusIsAway = ctx.focusTeam && m.awayTeam.id === ctx.focusTeam.id;
    const opp = focusIsHome
      ? m.awayTeam.name
      : focusIsAway
        ? m.homeTeam.name
        : `${m.homeTeam.name} vs ${m.awayTeam.name}`;
    const mine = focusIsHome ? m.homeScore : focusIsAway ? m.awayScore : null;
    const theirs = focusIsHome ? m.awayScore : focusIsAway ? m.homeScore : null;
    const result =
      mine == null || theirs == null
        ? `${m.homeScore}–${m.awayScore}`
        : mine > theirs
          ? `a ${mine}–${theirs} win`
          : mine < theirs
            ? `a ${mine}–${theirs} defeat`
            : `a ${mine}–${theirs} draw`;
    const pens =
      m.homePenalties != null
        ? ` (${m.homePenalties}–${m.awayPenalties} on penalties)`
        : "";
    return `${STAGE_LABELS[m.stage]}: ${result} vs ${opp}${pens}`;
  });
  return `The journey, match by match — ${lines.join(". ")}.`;
}

function buildTurningPoints(
  ctx: RecapContext,
  moments: ScoredMoment[],
): { title: string; description: string }[] {
  const points: { title: string; description: string }[] = [];

  const firstKnockout = ctx.knockoutPath[0];
  if (firstKnockout && ctx.focusTeam) {
    const focusIsHome = firstKnockout.homeTeam.id === ctx.focusTeam.id;
    const mine = focusIsHome ? firstKnockout.homeScore : firstKnockout.awayScore;
    const theirs = focusIsHome ? firstKnockout.awayScore : firstKnockout.homeScore;
    points.push({
      title: `First knockout test: ${STAGE_LABELS[firstKnockout.stage]}`,
      description:
        mine > theirs
          ? `${ctx.focusTeam.name} passed their first knockout examination ${mine}–${theirs}.`
          : mine === theirs
            ? `${ctx.focusTeam.name} survived a ${mine}–${theirs} battle decided on penalties.`
            : `${ctx.focusTeam.name}'s run met its first serious wall — a ${mine}–${theirs} defeat.`,
    });
  }

  const biggest = moments[0];
  if (biggest) {
    points.push({
      title: `The turning point: ${biggest.title}`,
      description: biggest.description,
    });
  }
  return points.slice(0, 3);
}

/** Light tonal rephrasing so the fallback still respects user preference. */
function toneAdjust(out: AiRecapOutput, prefs: RecapPreferences): AiRecapOutput {
  if (prefs.tone === "EXCITING" || prefs.tone === "COMMENTARY") {
    return {
      ...out,
      finalVerdict: out.finalVerdict.replace(/\.$/, "!"),
      title: out.title,
    };
  }
  if (prefs.tone === "STATISTICAL") {
    return {
      ...out,
      finalVerdict: `By the numbers: ${out.statisticsHighlights
        .map((s) => `${s.label.toLowerCase()} ${s.value}`)
        .join(", ")}.`,
    };
  }
  return out;
}
