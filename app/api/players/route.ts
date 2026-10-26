import { errorResponse, ok } from "@/lib/api-response";
import { playerRepo } from "@/repositories/sports.repository";
import type { Position } from "@prisma/client";

const POSITIONS = new Set(["GK", "DF", "MF", "FW"]);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const position = url.searchParams.get("position");
    const players = await playerRepo.list({
      teamId: url.searchParams.get("teamId") ?? undefined,
      tournamentId: url.searchParams.get("tournamentId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      position: position && POSITIONS.has(position) ? (position as Position) : undefined,
      take: Math.min(Number(url.searchParams.get("take")) || 50, 200),
      skip: Number(url.searchParams.get("skip")) || 0,
    });
    return ok(players);
  } catch (err) {
    return errorResponse(err);
  }
}
