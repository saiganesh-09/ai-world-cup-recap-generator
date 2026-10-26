import type { MatchWithContext } from "@/services/sports/provider";
import type { EventType, MatchStage, Position, Team } from "@prisma/client";

// Test fixtures — build MatchWithContext objects without a database.

let seq = 0;
export function team(partial: Partial<Team> = {}): Team {
  seq++;
  return {
    id: partial.id ?? `team-${seq}`,
    name: partial.name ?? `Team ${seq}`,
    shortName: partial.shortName ?? `T${seq}`,
    country: partial.country ?? `Country ${seq}`,
    flagEmoji: null,
    primaryColor: "#123456",
    ...partial,
  };
}

export function match(opts: {
  id?: string;
  home: Team;
  away: Team;
  h: number;
  a: number;
  hp?: number;
  ap?: number;
  stage?: MatchStage;
  events?: {
    type: EventType;
    minute: number;
    extraMinute?: number;
    teamId?: string;
    playerId?: string;
    playerName?: string;
    detail?: string;
    description?: string;
  }[];
}): MatchWithContext {
  seq++;
  const id = opts.id ?? `match-${seq}`;
  return {
    id,
    tournamentId: "t-1",
    homeTeamId: opts.home.id,
    awayTeamId: opts.away.id,
    date: new Date("2022-12-01"),
    venue: "Test Arena",
    stage: opts.stage ?? "GROUP",
    groupName: "A",
    status: "FINISHED",
    homeScore: opts.h,
    awayScore: opts.a,
    homePenScore: opts.hp ?? null,
    awayPenScore: opts.ap ?? null,
    homeTeam: opts.home,
    awayTeam: opts.away,
    teamStats: [],
    events: (opts.events ?? []).map((e, i) => ({
      id: `ev-${seq}-${i}`,
      matchId: id,
      type: e.type,
      minute: e.minute,
      extraMinute: e.extraMinute ?? null,
      detail: e.detail ?? null,
      description: e.description ?? null,
      teamId: e.teamId ?? null,
      playerId: e.playerId ?? null,
      team: e.teamId === opts.home.id ? opts.home : e.teamId === opts.away.id ? opts.away : null,
      player: e.playerId
        ? {
            id: e.playerId,
            name: e.playerName ?? "Player",
            teamId: opts.home.id,
            position: "FW" as Position,
            jerseyNumber: 9,
            photoUrl: null,
            age: null,
          }
        : null,
    })),
  };
}
