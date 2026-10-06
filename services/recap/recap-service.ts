import { z } from "zod";
import { prisma } from "@/lib/db";
import { recapRepo } from "@/repositories/recap-repo";
import { jobRepo } from "@/repositories/job-repo";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getSportsProvider } from "@/services/sports/provider";
import { kickJob } from "@/workers/job-processor";
import type { Recap } from "@prisma/client";

export const createRecapSchema = z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().optional().nullable(),
  playerId: z.string().optional().nullable(),
  type: z.enum([
    "TEAM_JOURNEY",
    "PLAYER_JOURNEY",
    "TOURNAMENT_HIGHLIGHTS",
    "BEST_MATCHES",
    "EMOTIONAL_STORY",
    "STATISTICAL_BREAKDOWN",
  ]),
  tone: z.enum(["EXCITING", "EMOTIONAL", "PROFESSIONAL", "STATISTICAL", "COMMENTARY"]),
  duration: z.enum(["SHORT", "STANDARD", "EXTENDED"]),
});

export type CreateRecapInput = z.infer<typeof createRecapSchema>;

export async function createRecap(userId: string, input: CreateRecapInput) {
  const data = createRecapSchema.parse(input);

  // Validate the selection exists before creating
  const provider = getSportsProvider();
  const tournament = await provider.getTournament(data.tournamentId);
  if (!tournament) throw new ValidationError("Tournament not found.");
  if (data.teamId && !(await provider.getTeam(data.teamId))) {
    throw new ValidationError("Team not found.");
  }
  if (data.playerId && !(await provider.getPlayer(data.playerId))) {
    throw new ValidationError("Player not found.");
  }
  if (data.type === "PLAYER_JOURNEY" && !data.playerId) {
    throw new ValidationError("Player Journey recaps require a player.");
  }
  if (
    ["TEAM_JOURNEY", "EMOTIONAL_STORY", "STATISTICAL_BREAKDOWN"].includes(
      data.type,
    ) &&
    !data.teamId
  ) {
    throw new ValidationError("This recap type requires a team.");
  }

  const subject = data.playerId
    ? (await provider.getPlayer(data.playerId))?.player.name
    : data.teamId
      ? (await provider.getTeam(data.teamId))?.name
      : tournament.name;

  return recapRepo.create({
    user: { connect: { id: userId } },
    tournament: { connect: { id: data.tournamentId } },
    ...(data.teamId ? { team: { connect: { id: data.teamId } } } : {}),
    ...(data.playerId ? { player: { connect: { id: data.playerId } } } : {}),
    type: data.type,
    tone: data.tone,
    duration: data.duration,
    title: `${subject} — ${tournament.name}`,
    status: "DRAFT",
  });
}

/**
 * Creates a GenerationJob and kicks the worker. Returns the job —
 * the client polls GET /recaps/:id/status for real progress.
 */
export async function enqueueGeneration(recap: Recap) {
  if (recap.status === "PROCESSING" || recap.status === "QUEUED") {
    const existing = await jobRepo.latestForRecap(recap.id);
    if (existing && ["QUEUED", "RUNNING"].includes(existing.status)) {
      return existing;
    }
  }
  const job = await jobRepo.create({
    recapId: recap.id,
    type: "RECAP",
  });
  await recapRepo.updateStatus(recap.id, "QUEUED", null);
  kickJob(job.id); // fire-and-forget in-process; standalone worker also picks it up
  return job;
}

/** Ownership guard — throws unless the recap belongs to the user. */
export function assertOwnership(recap: { userId: string }, userId: string) {
  if (recap.userId !== userId) throw new ForbiddenError();
}

export async function getOwnedRecap(recapId: string, userId: string) {
  const recap = await recapRepo.findById(recapId);
  if (!recap) throw new NotFoundError("Recap");
  assertOwnership(recap, userId);
  return recap;
}

export async function deleteOwnedRecap(recapId: string, userId: string) {
  const recap = await getOwnedRecap(recapId, userId);
  await prisma.recap.delete({ where: { id: recap.id } });
  return { ok: true };
}
