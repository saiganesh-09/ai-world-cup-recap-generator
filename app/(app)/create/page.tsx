import { RecapWizard } from "@/components/create/wizard";
import { getSportsProvider } from "@/services/sports/provider";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Recap" };

export default async function CreatePage() {
  const provider = getSportsProvider();
  const [tournaments, teams] = await Promise.all([
    provider.getTournaments(),
    provider.getTeams(),
  ]);

  // Player options with team names for the picker
  const playerRows = await prisma.player.findMany({
    include: { team: true },
    orderBy: [{ team: { name: "asc" } }, { jerseyNumber: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Create your recap</h1>
      <p className="mb-8 text-sm text-muted">
        Six quick steps to a personalized AI-generated tournament story.
      </p>
      <RecapWizard
        tournaments={tournaments.map((t) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          hostCountry: t.hostCountry,
        }))}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          flag: t.flag,
          fifaRanking: t.fifaRanking,
        }))}
        players={playerRows.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          jerseyNumber: p.jerseyNumber,
          teamName: p.team.name,
        }))}
      />
    </div>
  );
}
