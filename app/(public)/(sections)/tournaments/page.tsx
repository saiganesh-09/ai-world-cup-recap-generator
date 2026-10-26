import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { tournamentRepo } from "@/repositories/sports.repository";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const tournaments = await tournamentRepo.list();
  const counts = await Promise.all(
    tournaments.map(async (t) => ({
      id: t.id,
      matches: await prisma.match.count({ where: { tournamentId: t.id } }),
      teams: await prisma.tournamentTeam.count({ where: { tournamentId: t.id } }),
    })),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Tournaments</h1>
      <p className="mt-1 text-sm text-muted">Every competition in the database</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {tournaments.map((t) => {
          const c = counts.find((x) => x.id === t.id)!;
          return (
            <Card key={t.id} hover className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-4xl font-extrabold text-sky-400">{t.year}</span>
                  <h2 className="mt-1 text-xl font-semibold">{t.name}</h2>
                </div>
                {t.isDemo && <Badge color="gold">simulated</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {t.country}</span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {t.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {t.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="mt-5 flex gap-6 border-t border-line/50 pt-4 text-sm">
                <span><strong className="text-white">{c.teams}</strong> <span className="text-muted">teams</span></span>
                <span><strong className="text-white">{c.matches}</strong> <span className="text-muted">matches</span></span>
                <Link href={`/teams?tournament=${t.id}`} className="ml-auto text-sky-400 hover:underline">
                  View teams →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
