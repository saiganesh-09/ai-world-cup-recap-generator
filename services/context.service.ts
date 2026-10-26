import { NotFoundError } from "@/lib/errors";
import { matchRepo, playerRepo, teamRepo, tournamentRepo } from "@/repositories/sports.repository";
import type { RecapContext } from "@/types/domain";
import type { Match, MatchStage, Player, Team, Tournament } from "@prisma/client";
import { computeMoments } from "./moments.service";
import { getSportsProvider } from "./sports/api-football-provider";
import { matchResult, normalizeMatch, playerStats, teamStats } from "./stats.service";
import type { MatchWithContext } from "./sports/provider";

// Two-phase context building:
//   collectData  → raw entities + relevant matches (COLLECTING_DATA)
//   analyzeData  → stats, moments, normalized shape (ANALYZING/FINDING)
// Splitting them lets the job pipeline report honest progress.

export interface CollectedData {
  tournament: Tournament;
  focusTeam: Team | null;
  focusPlayer: (Player & { team: Team }) | null;
  matches: MatchWithContext[]; // matches in recap scope
  teamMatches: MatchWithContext[]; // focus team's matches for stats
}

export async function collectData(opts: {
  tournamentId: string;
  teamId?: string;
  playerId?: string;
}): Promise<CollectedData> {
  const tournament = await tournamentRepo.byId(opts.tournamentId);
  if (!tournament) throw new NotFoundError("Tournament");

  const focusTeam = opts.teamId ? await teamRepo.byId(opts.teamId) : null;
  if (opts.teamId && !focusTeam) throw new NotFoundError("Team");

  const focusPlayer = opts.playerId ? await playerRepo.byId(opts.playerId) : null;
  if (opts.playerId && !focusPlayer) throw new NotFoundError("Player");

  const provider = getSportsProvider();

  const matches = opts.playerId
    ? await matchRepo.forPlayerInTournament(opts.playerId, tournament.id)
    : opts.teamId
      ? await matchRepo.forTeamInTournament(opts.teamId, tournament.id)
      : await provider.getMatches(tournament.id);

  const scopeTeamId = opts.teamId ?? focusPlayer?.teamId;
  const teamMatches = scopeTeamId
    ? opts.teamId
      ? matches // already scoped to the team
      : await matchRepo.forTeamInTournament(scopeTeamId, tournament.id)
    : [];

  return { tournament, focusTeam, focusPlayer, matches, teamMatches };
}

export async function analyzeData(
  collected: CollectedData,
  opts: {
    type: string;
    tone: string;
    length: string;
    playerId?: string;
  },
): Promise<RecapContext> {
  const { tournament, focusTeam, focusPlayer, matches, teamMatches } = collected;
  const scopeTeamId = focusTeam?.id ?? focusPlayer?.teamId;

  const tStats = scopeTeamId ? teamStats(teamMatches, scopeTeamId) : null;

  const pStatRows = scopeTeamId
    ? await playerRepo.statsForTeam(scopeTeamId, tournament.id)
    : [];
  const topPlayers = playerStats(pStatRows);

  let focusPlayerStats: RecapContext["focusPlayer"] = null;
  if (focusPlayer) {
    const mine =
      topPlayers.find((p) => p.playerId === focusPlayer.id) ??
      playerStats(pStatRows.filter((r) => r.playerId === focusPlayer.id))[0];
    focusPlayerStats = {
      id: focusPlayer.id,
      name: focusPlayer.name,
      position: focusPlayer.position,
      teamName: focusPlayer.team.name,
      stats: {
        appearances: mine?.appearances ?? 0,
        minutes: mine?.minutes ?? 0,
        goals: mine?.goals ?? 0,
        assists: mine?.assists ?? 0,
        shots: mine?.shots ?? 0,
        tackles: mine?.tackles ?? 0,
        avgRating: mine?.avgRating ?? 0,
      },
    };
  }

  const focusTeamEntity = focusTeam ?? focusPlayer?.team ?? null;
  const moments = computeMoments(matches, {
    focusTeamId: scopeTeamId,
    focusPlayerId: opts.playerId,
  });

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      year: tournament.year,
      country: tournament.country,
      isDemo: tournament.isDemo,
    },
    focusTeam: focusTeamEntity
      ? {
          id: focusTeamEntity.id,
          name: focusTeamEntity.name,
          shortName: focusTeamEntity.shortName,
          flagEmoji: focusTeamEntity.flagEmoji,
          primaryColor: focusTeamEntity.primaryColor,
          stats: tStats!,
        }
      : null,
    focusPlayer: focusPlayerStats,
    matches: matches.map((m) => normalizeMatch(m, scopeTeamId ?? undefined)),
    topPlayers,
    moments,
    preferences: {
      type: opts.type as RecapContext["preferences"]["type"],
      tone: opts.tone as RecapContext["preferences"]["tone"],
      length: opts.length as RecapContext["preferences"]["length"],
    },
  };
}

export { matchResult };
export type { Match, MatchStage };
