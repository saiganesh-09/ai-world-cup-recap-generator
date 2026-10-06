import type { RecapContext, RecapPreferences } from "@/types";
import { getSportsProvider } from "@/services/sports/provider";
import { ValidationError } from "@/lib/errors";
import { stageOrder } from "@/lib/utils";

/**
 * Builds the normalized RecapContext handed to the AI + video pipelines.
 * Everything downstream consumes this shape — provider-agnostic.
 */
export async function buildRecapContext(input: {
  tournamentId: string;
  teamId?: string | null;
  playerId?: string | null;
  prefs: RecapPreferences;
}): Promise<RecapContext> {
  const provider = getSportsProvider();

  const tournament = await provider.getTournament(input.tournamentId);
  if (!tournament) throw new ValidationError("Tournament not found.");

  const focusTeam = input.teamId ? await provider.getTeam(input.teamId) : null;
  if (input.teamId && !focusTeam) throw new ValidationError("Team not found.");

  const focusPlayerFull = input.playerId
    ? await provider.getPlayer(input.playerId)
    : null;
  if (input.playerId && !focusPlayerFull)
    throw new ValidationError("Player not found.");

  const focusPlayer = focusPlayerFull
    ? { ...focusPlayerFull.player, team: focusPlayerFull.team }
    : null;

  const needsTeamScope =
    input.prefs.type === "TEAM_JOURNEY" ||
    input.prefs.type === "EMOTIONAL_STORY" ||
    input.prefs.type === "BEST_MATCHES" ||
    input.prefs.type === "STATISTICAL_BREAKDOWN";
  if (needsTeamScope && !focusTeam && input.prefs.type !== "BEST_MATCHES") {
    throw new ValidationError("This recap type requires a team selection.");
  }
  if (input.prefs.type === "PLAYER_JOURNEY" && !focusPlayer) {
    throw new ValidationError("This recap type requires a player selection.");
  }

  const scopeTeamId =
    focusTeam?.id ?? focusPlayer?.team.id ?? null;

  // Match scope: focus team's matches, or headline matches (knockout
  // rounds + highest-scoring group games) for tournament-wide types.
  const allMatches = await provider.getMatches({
    tournamentId: input.tournamentId,
    ...(scopeTeamId &&
    input.prefs.type !== "TOURNAMENT_HIGHLIGHTS" &&
    input.prefs.type !== "BEST_MATCHES"
      ? { teamId: scopeTeamId }
      : {}),
  });
  if (allMatches.length === 0) {
    throw new ValidationError("No matches found for this selection.");
  }

  let matches = allMatches;
  if (
    input.prefs.type === "TOURNAMENT_HIGHLIGHTS" ||
    input.prefs.type === "BEST_MATCHES"
  ) {
    const knockout = allMatches.filter((m) => stageOrder(m.stage) > 0);
    const topGroup = allMatches
      .filter((m) => m.stage === "GROUP")
      .sort(
        (a, b) =>
          b.homeScore + b.awayScore - (a.homeScore + a.awayScore),
      )
      .slice(0, 3);
    matches = [...knockout, ...topGroup].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  const teamStats = scopeTeamId
    ? await provider.getTeamTournamentStats(scopeTeamId, tournament.id)
    : null;

  const playerStats = await provider.getPlayers({
    ...(scopeTeamId ? { teamId: scopeTeamId } : {}),
    tournamentId: tournament.id,
  });

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      year: tournament.year,
      hostCountry: tournament.hostCountry,
    },
    focusTeam,
    focusPlayer,
    matches,
    teamStats,
    playerStats,
    knockoutPath: matches.filter((m) => stageOrder(m.stage) > 0),
  };
}
