import Link from "next/link";
import { notFound } from "next/navigation";
import { getSportsProvider } from "@/services/sports/provider";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerChart } from "@/components/players/player-chart";
import { STAGE_LABELS, POSITION_LABELS, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = await getSportsProvider().getPlayer(id);
  return { title: player ? player.player.name : "Player" };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = getSportsProvider();
  const player = await provider.getPlayer(id);
  if (!player) notFound();

  // Per-match stats for the performance chart + timeline
  const matchStats = await prisma.playerMatchStat.findMany({
    where: { playerId: id },
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
    },
    orderBy: { match: { date: "asc" } },
  });

  const goalsByMatch = matchStats.map((s) => ({
    label: `${s.match.homeTeam.shortName}–${s.match.awayTeam.shortName} ${STAGE_LABELS[s.match.stage].slice(0, 9)}`,
    goals: s.goals,
    assists: s.assists,
    rating: s.rating,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-xl font-bold text-accent">
            {player.player.jerseyNumber}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {player.player.name}
              {player.player.isStar && (
                <span className="ml-2 text-accent" title="Star player">★</span>
              )}
            </h1>
            <p className="text-sm text-muted">
              {POSITION_LABELS[player.player.position]} ·{" "}
              <Link
                href={`/teams/${player.team.id}`}
                className="text-accent underline-offset-4 hover:underline"
              >
                {player.team.flag} {player.team.name}
              </Link>
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {player.avgRating.toFixed(1)} avg rating
          </Badge>
        </CardContent>
      </Card>

      {/* Season totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Appearances", value: player.appearances },
          { label: "Minutes", value: player.minutes },
          { label: "Goals", value: player.goals, accent: true },
          { label: "Assists", value: player.assists },
          { label: "Shots", value: player.shots },
          { label: "Tackles", value: player.tackles },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">
                {s.label}
              </p>
              <p
                className={`mt-1.5 text-xl font-bold ${s.accent ? "text-accent" : ""}`}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Match-by-match output</CardTitle>
            <CardDescription>Goals, assists and rating per match</CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerChart data={goalsByMatch} />
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {matchStats.map((s) => (
                <li
                  key={s.matchId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {s.match.homeTeam.shortName} {s.match.homeScore}–
                      {s.match.awayScore} {s.match.awayTeam.shortName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {STAGE_LABELS[s.match.stage]} · {formatDate(s.match.date)} ·{" "}
                      {s.minutes}&apos;
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p className="font-semibold text-accent">
                      {s.goals}G {s.assists}A
                    </p>
                    <p>rating {s.rating.toFixed(1)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
