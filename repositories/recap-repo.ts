import { prisma } from "@/lib/db";
import type { Prisma, RecapStatus } from "@prisma/client";

export const recapInclude = {
  tournament: true,
  team: true,
  player: true,
  moments: {
    orderBy: { order: "asc" as const },
    include: { match: { include: { homeTeam: true, awayTeam: true } }, player: true },
  },
} satisfies Prisma.RecapInclude;

export const recapRepo = {
  listByUser(userId: string, opts?: { skip?: number; take?: number }) {
    return prisma.recap.findMany({
      where: { userId },
      include: { tournament: true, team: true, player: true },
      orderBy: { createdAt: "desc" },
      skip: opts?.skip ?? 0,
      take: opts?.take ?? 50,
    });
  },
  countByUser(userId: string) {
    return prisma.recap.count({ where: { userId } });
  },
  findById(id: string) {
    return prisma.recap.findUnique({ where: { id }, include: recapInclude });
  },
  findByShareId(shareId: string) {
    return prisma.recap.findUnique({
      where: { shareId },
      include: recapInclude,
    });
  },
  create(data: Prisma.RecapCreateInput) {
    return prisma.recap.create({ data });
  },
  update(id: string, data: Prisma.RecapUpdateInput) {
    return prisma.recap.update({ where: { id }, data });
  },
  updateStatus(id: string, status: RecapStatus, error?: string | null) {
    return prisma.recap.update({
      where: { id },
      data: { status, ...(error !== undefined ? { error } : {}) },
    });
  },
  delete(id: string) {
    return prisma.recap.delete({ where: { id } });
  },
  replaceMoments(
    recapId: string,
    moments: {
      matchId?: string | null;
      playerId?: string | null;
      minute?: number | null;
      title: string;
      description: string;
      importanceScore: number;
      order: number;
    }[],
  ) {
    return prisma.$transaction([
      prisma.recapMoment.deleteMany({ where: { recapId } }),
      prisma.recapMoment.createMany({
        data: moments.map((m) => ({ ...m, recapId })),
      }),
    ]);
  },
};
