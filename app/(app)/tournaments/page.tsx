import Link from "next/link";
import { getSportsProvider } from "@/services/sports/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";
import {
  Trophy,
  CalendarDays,
  MapPin,
  Wand2,
  Medal,
  Target,
  Goal,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const provider = getSportsProvider();
  const tournaments = await provider.getTournaments();

  const enriched = await Promise.all(
    tournaments.map(async (t) => {
      const [teams, matches, players] = await Promise.all([
        provider.getTeams(t.id),
        provider.getMatches({ tournamentId: t.id }),
        provider.getPlayers({ tournamentId: t.id }),
      ]);
      const stats = await Promise.all(
        teams.map((team) =>
          provider.getTeamTournamentStats(team.id, t.id),
        ),
      );
      const byFinish = new Map(stats.map((s, i) => [s?.bestFinish, teams[i]]));
      const champion = byFinish.get("Champions");
      const runnerUp = byFinish.get("Runners-up");
      const totalGoals = stats.reduce((s, x) => s + (x?.goalsFor ?? 0), 0);
      const topScorer = [...players].sort(
        (a, b) => b.goals - a.goals || b.assists - a.assists,
      )[0];
      return {
        t,
        teamCount: teams.length,
        matchCount: matches.length,
        champion,
        runnerUp,
        totalGoals,
        topScorer,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
        <p className="mt-1 text-sm text-muted">World Cup editions in the dataset</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {enriched.map(
          ({ t, teamCount, matchCount, champion, runnerUp, totalGoals, topScorer }) => (
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

                {/* Podium */}
                {(champion || runnerUp) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {champion && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                          <Trophy className="size-3" aria-hidden /> Champions
                        </p>
                        <p className="mt-1.5 flex items-center gap-2 text-sm font-bold">
                          <Flag code={champion.shortName} name={champion.name} />
                          {champion.name}
                        </p>
                      </div>
                    )}
                    {runnerUp && (
                      <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                          <Medal className="size-3" aria-hidden /> Runners-up
                        </p>
                        <p className="mt-1.5 flex items-center gap-2 text-sm font-bold">
                          <Flag code={runnerUp.shortName} name={runnerUp.name} />
                          {runnerUp.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Numbers */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                  <div>
                    <p className="text-lg font-bold">{teamCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted">
                      Teams
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{matchCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted">
                      Matches
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-accent">{totalGoals}</p>
                    <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-widest text-muted">
                      <Goal className="size-3" aria-hidden /> Goals
                    </p>
                  </div>
                </div>

                {topScorer && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <Target className="size-3.5 text-accent" aria-hidden />
                    Golden Boot:{" "}
                    <Link
                      href={`/players/${topScorer.player.id}`}
                      className="font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline"
                    >
                      {topScorer.player.name}
                    </Link>
                    · {topScorer.goals} goals
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <Button size="sm" variant="secondary" asChild>
                    <Link href="/create">
                      <Wand2 aria-hidden /> Create recap
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
