import Link from "next/link";
import { Suspense } from "react";
import { getSportsProvider } from "@/services/sports/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search-input";
import { Flag } from "@/components/flag";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Teams" };

async function TeamGrid({ q }: { q?: string }) {
  const provider = getSportsProvider();
  const [tournaments, teams] = await Promise.all([
    provider.getTournaments(),
    provider.getTeams(),
  ]);
  const tournament = tournaments[0];

  const filtered = q
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q) ||
          t.shortName.toLowerCase().includes(q),
      )
    : teams;

  // Pull per-team tournament stats
  const withStats = tournament
    ? await Promise.all(
        filtered.map(async (t) => ({
          team: t,
          stats: await provider.getTeamTournamentStats(t.id, tournament.id),
        })),
      )
    : filtered.map((t) => ({ team: t, stats: null }));

  if (withStats.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No teams found"
        description="Try a different search term."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {withStats.map(({ team, stats }) => (
        <Link key={team.id} href={`/teams/${team.id}`} className="card-hover block">
          <Card className="h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <Flag code={team.shortName} name={team.name} className="text-4xl" />
                <Badge variant="secondary">#{team.fifaRanking}</Badge>
              </div>
              <h3 className="mt-3 text-lg font-bold">{team.name}</h3>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">
                {team.shortName} · {team.country}
              </p>
              {stats && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                  <span>
                    {stats.won}W {stats.drawn}D {stats.lost}L
                  </span>
                  <span className="font-semibold text-accent">{stats.bestFinish}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted">
            Every nation in the tournament
          </p>
        </div>
        <SearchInput placeholder="Search teams…" />
      </div>
      <Suspense>
        <TeamGrid q={q?.toLowerCase()} />
      </Suspense>
    </div>
  );
}
