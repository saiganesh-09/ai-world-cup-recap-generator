import Link from "next/link";
import { getSportsProvider } from "@/services/sports/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, CalendarDays, MapPin, Wand2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const provider = getSportsProvider();
  const tournaments = await provider.getTournaments();

  const counts = await Promise.all(
    tournaments.map(async (t) => ({
      t,
      teams: (await provider.getTeams(t.id)).length,
      matches: (await provider.getMatches({ tournamentId: t.id })).length,
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
        <p className="mt-1 text-sm text-muted">World Cup editions in the dataset</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {counts.map(({ t, teams, matches }) => (
          <Card key={t.id} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <Trophy className="size-8 text-accent" aria-hidden />
                <div className="flex gap-2">
                  <Badge variant="secondary">{t.status}</Badge>
                  {t.isDemo && <Badge variant="outline">Demo data</Badge>}
                </div>
              </div>
              <h2 className="mt-4 text-xl font-bold">{t.name}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <MapPin className="size-3.5" aria-hidden /> {t.hostCountry}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <CalendarDays className="size-3.5" aria-hidden />
                {formatDate(t.startDate)} — {formatDate(t.endDate)}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted">
                  {teams} teams · {matches} matches
                </span>
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/create">
                    <Wand2 aria-hidden /> Create recap
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
