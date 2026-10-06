import { prisma } from "@/lib/db";
import type { JobStatus, JobType, Prisma } from "@prisma/client";

export const jobRepo = {
  create(data: {
    recapId?: string;
    type: JobType;
    payload?: Prisma.InputJsonValue;
  }) {
    return prisma.generationJob.create({ data });
  },
  findById(id: string) {
    return prisma.generationJob.findUnique({
      where: { id },
      include: { recap: true },
    });
  },
  latestForRecap(recapId: string) {
    return prisma.generationJob.findFirst({
      where: { recapId },
      orderBy: { createdAt: "desc" },
    });
  },
  setRunning(id: string, stage: string, progress: number) {
    return prisma.generationJob.update({
      where: { id },
      data: { status: "RUNNING", stage, progress, startedAt: new Date() },
    });
  },
  setProgress(id: string, stage: string, progress: number) {
    return prisma.generationJob.update({
      where: { id },
      data: { stage, progress },
    });
  },
  setStatus(
    id: string,
    status: JobStatus,
    extra?: { error?: string; progress?: number },
  ) {
    return prisma.generationJob.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
        ...extra,
      },
    });
  },
};
