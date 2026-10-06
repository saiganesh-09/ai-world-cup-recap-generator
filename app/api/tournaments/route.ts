import { apiHandler, ok } from "@/lib/api";
import { getSportsProvider } from "@/services/sports/provider";

export const GET = apiHandler(async () => {
  const tournaments = await getSportsProvider().getTournaments();
  return ok({ tournaments });
});
