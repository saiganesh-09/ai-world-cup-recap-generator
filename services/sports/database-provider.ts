import {
  matchRepo,
  playerRepo,
  teamRepo,
  tournamentRepo,
} from "@/repositories/sports.repository";
import type { MatchWithContext, SportsDataProvider } from "./provider";

// Serves data from the seeded PostgreSQL database. This is the default
// provider — the app is fully functional with zero external dependencies.

export class DatabaseProvider implements SportsDataProvider {
  readonly name = "database";

  getTournaments() {
    return tournamentRepo.list();
  }
  getTournament(id: string) {
    return tournamentRepo.byId(id);
  }
  getTeams(tournamentId?: string) {
    return teamRepo.list({ tournamentId, take: 200 });
  }
  getTeam(id: string) {
    return teamRepo.byId(id);
  }
  getPlayers(teamId?: string) {
    return playerRepo.list({ teamId, take: 300 });
  }
  async getPlayer(id: string) {
    const p = await playerRepo.byId(id);
    return p;
  }
  async getMatches(tournamentId: string, teamId?: string): Promise<MatchWithContext[]> {
    if (teamId) return matchRepo.forTeamInTournament(teamId, tournamentId);
    return matchRepo.forTournament(tournamentId);
  }
  getMatch(id: string) {
    return matchRepo.byId(id);
  }
}
