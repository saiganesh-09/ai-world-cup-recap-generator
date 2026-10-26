import { errorResponse, ok } from "@/lib/api-response";
import { getSportsProvider } from "@/services/sports/api-football-provider";

export async function GET() {
  try {
    const tournaments = await getSportsProvider().getTournaments();
    return ok(tournaments);
  } catch (err) {
    return errorResponse(err);
  }
}
