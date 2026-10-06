import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";
import { getLiveState } from "@/services/live/simulator";

/**
 * GET /api/live — the currently-simulated live match.
 *
 * Public + stateless: state is a pure function of wall-clock time, so every
 * viewer sees the same match minute. Clients poll every ~10s. A short HTTP
 * cache lets bursts of viewers share one computation.
 */
export const GET = apiHandler(async () => {
  const provider = getSportsProvider();
  const [teams, players] = await Promise.all([
    provider.getTeams(),
    provider.getPlayers({}),
  ]);
  const state = getLiveState(Date.now(), teams, players);
  return ok(state, {
    headers: { "Cache-Control": "public, max-age=3, stale-while-revalidate=5" },
  });
});
