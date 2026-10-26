import type { Metadata } from "next";
import { CreateWizard } from "@/components/recap/create-wizard";
import { tournamentRepo } from "@/repositories/sports.repository";

export const metadata: Metadata = { title: "Create Recap" };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tournamentId = typeof sp.tournament === "string" ? sp.tournament : undefined;
  const teamId = typeof sp.team === "string" ? sp.team : undefined;
  const tournaments = await tournamentRepo.list();
  return (
    <CreateWizard
      tournaments={tournaments}
      initialTournamentId={tournamentId}
      initialTeamId={teamId}
    />
  );
}
