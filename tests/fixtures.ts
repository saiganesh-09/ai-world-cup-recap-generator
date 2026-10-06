import type { NormalizedMatch, TeamRef } from "@/types";

export const IND: TeamRef = {
  id: "ind",
  name: "India",
  shortName: "IND",
  country: "India",
  flag: "🇮🇳",
  primaryColor: "#f97316",
  accentColor: "#1e3a8a",
  fifaRanking: 121,
};

export const JPN: TeamRef = {
  id: "jpn",
  name: "Japan",
  shortName: "JPN",
  country: "Japan",
  flag: "🇯🇵",
  primaryColor: "#1e40af",
  accentColor: "#dc2626",
  fifaRanking: 15,
};

export const BRA: TeamRef = {
  id: "bra",
  name: "Brazil",
  shortName: "BRA",
  country: "Brazil",
  flag: "🇧🇷",
  primaryColor: "#facc15",
  accentColor: "#166534",
  fifaRanking: 5,
};

export function makeMatch(overrides: Partial<NormalizedMatch> = {}): NormalizedMatch {
  return {
    id: "m1",
    date: "2026-06-11T00:00:00Z",
    venue: "SoFi Stadium",
    stage: "GROUP",
    status: "FINISHED",
    homeTeam: IND,
    awayTeam: JPN,
    homeScore: 2,
    awayScore: 1,
    homePenalties: null,
    awayPenalties: null,
    events: [
      {
        id: "e1",
        minute: 34,
        type: "GOAL",
        teamId: "ind",
        playerId: "p1",
        playerName: "Lallianzuala Chhangte",
        assistPlayerId: "p2",
        assistPlayerName: "Sunil Chhetri",
        description: "Chhangte opens the scoring",
      },
      {
        id: "e2",
        minute: 61,
        type: "GOAL",
        teamId: "jpn",
        playerId: "p9",
        playerName: "Kaoru Mitoma",
        assistPlayerId: null,
        assistPlayerName: null,
        description: "Mitoma equalizes",
      },
      {
        id: "e3",
        minute: 89,
        type: "GOAL",
        teamId: "ind",
        playerId: "p2",
        playerName: "Sunil Chhetri",
        assistPlayerId: "p3",
        assistPlayerName: "Sahal Abdul Samad",
        description: "Chhetri's late winner",
      },
    ],
    homeStats: { possession: 44, shots: 9, shotsOnTarget: 4, corners: 3, fouls: 11 },
    awayStats: { possession: 56, shots: 12, shotsOnTarget: 5, corners: 7, fouls: 8 },
    ...overrides,
  };
}
