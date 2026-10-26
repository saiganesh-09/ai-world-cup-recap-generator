import { prisma } from "@/lib/prisma";
import type { PipelineStage } from "@/types/domain";
import { STAGE_PROGRESS } from "@/types/domain";
import type {
  JobStatus,
  Prisma,
  RecapLength,
  RecapStatus,
  RecapTone,
  RecapType,
} from "@prisma/client";

export const recapRepo = {
  create: (data: {
    userId: string;
    tournamentId: string;
    teamId?: string;
    playerId?: string;
    type: RecapType;
    tone: RecapTone;
    length: RecapLength;
  }) => prisma.recap.create({ data: { ...data, status: "DRAFT" } }),

  byId: (id: string) =>
    prisma.recap.findUnique({
      where: { id },
      include: {
        team: true,
        player: { include: { team: true } },
        tournament: true,
        moments: {
          include: { match: { include: { homeTeam: true, awayTeam: true } }, player: true },
          orderBy: { order: "asc" },
        },
        job: true,
      },
    }),

  // Authorization is enforced by always scoping list/detail to userId.
  forUser: (userId: string) =>
    prisma.recap.findMany({
      where: { userId },
      include: {
        team: true,
        player: true,
        tournament: true,
        job: { select: { status: true, progress: true, stage: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

  forUserById: (id: string, userId: string) =>
    prisma.recap.findFirst({
      where: { id, userId },
      include: {
        team: true,
        player: { include: { team: true } },
        tournament: true,
        moments: {
          include: { match: { include: { homeTeam: true, awayTeam: true } }, player: true },
          orderBy: { order: "asc" },
        },
        job: true,
      },
    }),

  update: (id: string, data: Prisma.RecapUpdateInput) =>
    prisma.recap.update({ where: { id }, data }),

  setStatus: (id: string, status: RecapStatus, error?: string) =>
    prisma.recap.update({
      where: { id },
      data: { status, ...(error !== undefined ? { error } : {}) },
    }),

  delete: (id: string) => prisma.recap.delete({ where: { id } }),

  replaceMoments: async (
    recapId: string,
    moments: {
      matchId?: string;
      playerId?: string;
      minute?: number;
      title: string;
      description: string;
      importanceScore: number;
      order: number;
    }[],
  ) => {
    await prisma.recapMoment.deleteMany({ where: { recapId } });
    if (moments.length) {
      await prisma.recapMoment.createMany({
        data: moments.map((m) => ({ ...m, recapId })),
      });
    }
  },
};

export const jobRepo = {
  create: (recapId: string) =>
    prisma.generationJob.create({ data: { recapId } }),

  byRecapId: (recapId: string) =>
    prisma.generationJob.findUnique({ where: { recapId } }),

  setStage: (jobId: string, stage: PipelineStage) =>
    prisma.generationJob.update({
      where: { id: jobId },
      data: { stage, progress: STAGE_PROGRESS[stage], status: "RUNNING" },
    }),

  start: (jobId: string) =>
    prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    }),

  complete: (jobId: string) =>
    prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
    }),

  fail: (jobId: string, error: string) =>
    prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: error.slice(0, 500), completedAt: new Date() },
    }),

  /** Claim the oldest pending job (atomic-ish via status transition). */
  claimNext: async () => {
    const job = await prisma.generationJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { recap: true },
    });
    if (!job) return null;
    const claimed = await prisma.generationJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "RUNNING", lockedAt: new Date(), startedAt: new Date(), attempts: { increment: 1 } },
    });
    return claimed.count === 1 ? job : null;
  },

  /** Requeue jobs whose worker died mid-flight (stale lock). */
  recoverStale: async (staleMs = 10 * 60 * 1000) => {
    const cutoff = new Date(Date.now() - staleMs);
    return prisma.generationJob.updateMany({
      where: { status: "RUNNING", lockedAt: { lt: cutoff } },
      data: { status: "PENDING", lockedAt: null },
    });
  },

  pendingCount: () => prisma.generationJob.count({ where: { status: "PENDING" } }),
};

export type JobWithStatus = { status: JobStatus };
