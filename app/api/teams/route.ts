import { errorResponse, ok } from "@/lib/api-response";
import { teamRepo } from "@/repositories/sports.repository";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const teams = await teamRepo.list({
      tournamentId: url.searchParams.get("tournamentId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      take: Math.min(Number(url.searchParams.get("take")) || 100, 200),
      skip: Number(url.searchParams.get("skip")) || 0,
    });
    return ok(teams);
  } catch (err) {
    return errorResponse(err);
  }
}
