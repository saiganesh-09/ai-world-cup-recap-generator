import { RecapWizard } from "@/components/create/wizard";
import { getSportsProvider } from "@/services/sports/provider";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit, Sparkles, Film, BarChart3 } from "lucide-react";
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
          teamShortName: p.team.shortName,
        }))}
      />

      {/* What you'll get */}
      <div className="mx-auto mt-6 w-full max-w-3xl">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BrainCircuit,
                title: "AI story",
                desc: "Narrative built from real stats — validated, never invented.",
              },
              {
                icon: Sparkles,
                title: "Top moments",
                desc: "Goals, upsets and turning points ranked 0–100 by importance.",
              },
              {
                icon: Film,
                title: "Highlight video",
                desc: "Cinematic slides + audio assembled by FFmpeg in the background.",
              },
              {
                icon: BarChart3,
                title: "Shareable page",
                desc: "Stats, timeline and a public link you can send to anyone.",
              },
            ].map((f) => (
              <div key={f.title} className="flex flex-col gap-1.5">
                <f.icon className="size-4.5 text-accent" aria-hidden />
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
