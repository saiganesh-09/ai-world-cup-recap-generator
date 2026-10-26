import type { Match, MatchEvent, Player, Team, TeamMatchStat, Tournament } from "@prisma/client";

// ── SportsDataProvider ──────────────────────────────────────
// Abstraction over football data sources. The app ships with a
// DatabaseProvider (seeded data, always available) and an
// ApiFootballProvider (external API). Swap via SPORTS_API_KEY.

export interface MatchWithContext extends Match {
  homeTeam: Team;
  awayTeam: Team;
  events: (MatchEvent & { player: Player | null; team: Team | null })[];
  teamStats?: TeamMatchStat[];
}

export interface SportsDataProvider {
  readonly name: string;
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | null>;
  getTeams(tournamentId?: string): Promise<Team[]>;
  getTeam(id: string): Promise<Team | null>;
  getPlayers(teamId?: string): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | null>;
  getMatches(tournamentId: string, teamId?: string): Promise<MatchWithContext[]>;
  getMatch(id: string): Promise<MatchWithContext | null>;
}
