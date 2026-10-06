import Link from "next/link";
import { notFound } from "next/navigation";
import { getSportsProvider } from "@/services/sports/provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, MapPin } from "lucide-react";
import { STAGE_LABELS, POSITION_LABELS, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = await getSportsProvider().getTeam(id);
  return { title: team ? `${team.name} — Team` : "Team" };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = getSportsProvider();
  const team = await provider.getTeam(id);
  if (!team) notFound();

  const [tournaments, matches, players] = await Promise.all([
    provider.getTournaments(),
    provider.getMatches({ teamId: id }),
    provider.getPlayers({ teamId: id }),
  ]);
  const tournament = tournaments[0];
  const stats = tournament
    ? await provider.getTeamTournamentStats(id, tournament.id)
    : null;
  const playerById = new Map(players.map((p) => [p.player.id, p]));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card
        className="overflow-hidden"
        style={{ borderTopColor: team.accentColor, borderTopWidth: 3 }}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <span aria-hidden className="text-5xl">
              {team.flag}
            </span>
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-sm text-muted">
                {team.country} · FIFA rank #{team.fifaRanking}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/create`}>
              <Wand2 aria-hidden /> Create Team Recap
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Tournament stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Played", value: stats.played },
            { label: "Record", value: `${stats.won}W ${stats.drawn}D ${stats.lost}L` },
            { label: "Goals", value: `${stats.goalsFor}–${stats.goalsAgainst}` },
            { label: "Clean sheets", value: stats.cleanSheets },
            { label: "Possession", value: `${stats.avgPossession}%` },
            { label: "Best finish", value: stats.bestFinish, accent: true },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted">
                  {s.label}
                </p>
                <p
                  className={`mt-1.5 text-lg font-bold ${s.accent ? "text-accent" : ""}`}
                >
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament matches</CardTitle>
            <CardDescription>{matches.length} played</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {matches.map((m) => {
                const isHome = m.homeTeam.id === id;
                const mine = isHome ? m.homeScore : m.awayScore;
                const theirs = isHome ? m.awayScore : m.homeScore;
                const result = mine > theirs ? "W" : mine < theirs ? "L" : "D";
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {m.homeTeam.shortName} {m.homeScore}–{m.awayScore}{" "}
                        {m.awayTeam.shortName}
                        {m.homePenalties != null &&
                          ` (${m.homePenalties}–${m.awayPenalties} p)`}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        {STAGE_LABELS[m.stage]} · {formatDate(m.date)} ·
                        <MapPin className="size-3" aria-hidden /> {m.venue}
                      </p>
                    </div>
                    <Badge
                      variant={
                        result === "W"
                          ? "success"
                          : result === "L"
                            ? "danger"
                            : "secondary"
                      }
                    >
                      {result}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Squad */}
        <Card>
          <CardHeader>
            <CardTitle>Squad</CardTitle>
            <CardDescription>Appearances and output</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5">
              {team.players.map((p) => {
                const s = playerById.get(p.id);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/players/${p.id}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-accent">
                          {p.jerseyNumber}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {p.name}{" "}
                            {p.isStar && (
                              <span className="text-accent" title="Star player">
                                ★
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted">
                            {POSITION_LABELS[p.position]}
                          </p>
                        </div>
                      </div>
                      {s && (
                        <span className="text-xs text-muted">
                          {s.appearances} apps ·{" "}
                          <span className="font-semibold text-accent">
                            {s.goals}G {s.assists}A
                          </span>{" "}
                          · {s.avgRating.toFixed(1)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
