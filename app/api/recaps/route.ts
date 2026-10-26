import { z } from "zod";
import { created, errorResponse, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recapRepo } from "@/repositories/recap.repository";

const createSchema = z
  .object({
    tournamentId: z.string().min(1),
    teamId: z.string().optional(),
    playerId: z.string().optional(),
    type: z.enum([
      "TEAM_JOURNEY",
      "PLAYER_JOURNEY",
      "TOURNAMENT_HIGHLIGHTS",
      "BEST_MATCHES",
      "EMOTIONAL_STORY",
      "STATISTICAL_BREAKDOWN",
    ]),
    tone: z.enum(["EXCITING", "EMOTIONAL", "PROFESSIONAL", "STATISTICAL", "COMMENTARY"]),
    length: z.enum(["SHORT", "STANDARD", "EXTENDED"]),
  })
  .refine((v) => v.teamId || v.playerId || v.type === "TOURNAMENT_HIGHLIGHTS" || v.type === "BEST_MATCHES", {
    message: "Select a team or player (or choose a tournament-wide recap).",
  });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = createSchema.parse(await req.json());
    const recap = await recapRepo.create({ userId: user.id, ...input });
    await prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        event: "recap_created",
        metadata: { recapId: recap.id, type: recap.type },
      },
    });
    return created(recap);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const recaps = await recapRepo.forUser(user.id);
    return ok(recaps);
  } catch (err) {
    return errorResponse(err);
  }
}
