import { prisma } from "@/lib/prisma";
import type { MatchStage, Position, Prisma } from "@prisma/client";

// Data-access layer for the tournament domain. All queries live here —
// services never touch Prisma directly.

export const tournamentRepo = {
  list: () =>
    prisma.tournament.findMany({ orderBy: { year: "desc" } }),

  byId: (id: string) => prisma.tournament.findUnique({ where: { id } }),

  withTeams: (id: string) =>
    prisma.tournament.findUnique({
      where: { id },
      include: { teams: { include: { team: true } } },
    }),
};

export const teamRepo = {
  list: (opts?: { tournamentId?: string; search?: string; take?: number; skip?: number }) =>
    prisma.team.findMany({
      where: {
        ...(opts?.tournamentId
          ? { tournaments: { some: { tournamentId: opts.tournamentId } } }
          : {}),
        ...(opts?.search
          ? { name: { contains: opts.search, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        _count: { select: { players: true, tournaments: true } },
      },
      orderBy: { name: "asc" },
      take: opts?.take ?? 100,
      skip: opts?.skip ?? 0,
    }),

  byId: (id: string) => prisma.team.findUnique({ where: { id } }),

  detail: (id: string) =>
    prisma.team.findUnique({
      where: { id },
      include: {
        players: { orderBy: [{ position: "asc" }, { jerseyNumber: "asc" }] },
        tournaments: { include: { tournament: true } },
      },
    }),

  matches: (teamId: string, tournamentId?: string) =>
    prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        ...(tournamentId ? { tournamentId } : {}),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: { include: { player: true, team: true }, orderBy: { minute: "asc" } },
      },
      orderBy: { date: "asc" },
    }),
};

export const playerRepo = {
  list: (opts?: {
    teamId?: string;
    search?: string;
    position?: Position;
    tournamentId?: string;
    take?: number;
    skip?: number;
  }) =>
    prisma.player.findMany({
      where: {
        ...(opts?.teamId ? { teamId: opts.teamId } : {}),
        ...(opts?.position ? { position: opts.position } : {}),
        ...(opts?.search
          ? { name: { contains: opts.search, mode: "insensitive" as const } }
          : {}),
        ...(opts?.tournamentId
          ? { team: { tournaments: { some: { tournamentId: opts.tournamentId } } } }
          : {}),
      },
      include: { team: true },
      orderBy: { name: "asc" },
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
    }),

  count: (opts?: { search?: string; position?: Position }) =>
    prisma.player.count({
      where: {
        ...(opts?.position ? { position: opts.position } : {}),
        ...(opts?.search
          ? { name: { contains: opts.search, mode: "insensitive" as const } }
          : {}),
      },
    }),

  byId: (id: string) =>
    prisma.player.findUnique({ where: { id }, include: { team: true } }),

  statsForPlayer: (playerId: string) =>
    prisma.playerMatchStat.findMany({
      where: { playerId },
      include: {
        match: {
          include: { homeTeam: true, awayTeam: true, tournament: true },
        },
      },
      orderBy: { match: { date: "asc" } },
    }),

  statsForTeam: (teamId: string, tournamentId?: string) =>
    prisma.playerMatchStat.findMany({
      where: {
        player: { teamId },
        ...(tournamentId ? { match: { tournamentId } } : {}),
      },
      include: { player: true, match: true },
    }),
};

export const matchRepo = {
  byId: (id: string) =>
    prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        tournament: true,
        events: {
          include: { player: true, team: true },
          orderBy: [{ minute: "asc" }, { extraMinute: "asc" }],
        },
      },
    }),

  forTeamInTournament: (teamId: string, tournamentId: string) =>
    prisma.match.findMany({
      where: {
        tournamentId,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: { include: { player: true, team: true }, orderBy: { minute: "asc" } },
        teamStats: true,
      },
      orderBy: { date: "asc" },
    }),

  forTournament: (tournamentId: string, stage?: MatchStage) =>
    prisma.match.findMany({
      where: { tournamentId, ...(stage ? { stage } : {}) },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: { include: { player: true, team: true }, orderBy: { minute: "asc" } },
      },
      orderBy: { date: "asc" },
    }),

  forPlayerInTournament: (playerId: string, tournamentId: string) =>
    prisma.match.findMany({
      where: {
        tournamentId,
        playerStats: { some: { playerId } },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: { include: { player: true, team: true }, orderBy: { minute: "asc" } },
        playerStats: { where: { playerId } },
      },
      orderBy: { date: "asc" },
    }),
};

export type MatchWithRelations = Prisma.MatchGetPayload<{
  include: {
    homeTeam: true;
    awayTeam: true;
    events: { include: { player: true; team: true } };
    teamStats: true;
  };
}>;
