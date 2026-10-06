import type {
  NormalizedMatch,
  PlayerRef,
  PlayerTournamentStats,
  TeamRef,
  TeamTournamentStats,
} from "@/types";
import type { Tournament } from "@prisma/client";
import { hasSportsApi } from "@/lib/env";
import { DemoDataProvider } from "./demo-provider";
import { ApiFootballProvider } from "./api-football-provider";

/**
 * SportsDataProvider — the single seam between our domain and the
 * outside sports world. Providers may be swapped via env config
 * without touching any service or route code.
 */
export interface SportsDataProvider {
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | null>;
  getTeams(tournamentId?: string): Promise<TeamRef[]>;
  getTeam(id: string): Promise<(TeamRef & { players: PlayerRef[] }) | null>;
  getPlayers(opts?: {
    teamId?: string;
    tournamentId?: string;
  }): Promise<PlayerTournamentStats[]>;
  getPlayer(
    id: string,
  ): Promise<(PlayerTournamentStats & { team: TeamRef }) | null>;
  getMatches(opts?: {
    tournamentId?: string;
    teamId?: string;
  }): Promise<NormalizedMatch[]>;
  getMatch(id: string): Promise<NormalizedMatch | null>;
  getTeamTournamentStats(
    teamId: string,
    tournamentId: string,
  ): Promise<TeamTournamentStats | null>;
  readonly kind: "demo" | "api";
}

let provider: SportsDataProvider | null = null;

export function getSportsProvider(): SportsDataProvider {
  if (!provider) {
    provider = hasSportsApi()
      ? new ApiFootballProvider()
      : new DemoDataProvider();
  }
  return provider;
}

/** Test hook — reset the memoized provider. */
export function _resetProvider() {
  provider = null;
}
