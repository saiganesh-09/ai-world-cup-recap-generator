import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, Film, Trophy, Star, ArrowRight, Clock } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap-repo";
import { getSportsProvider } from "@/services/sports/provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "danger"> = {
  COMPLETED: "success",
  PROCESSING: "default",
  QUEUED: "default",
  FAILED: "danger",
  DRAFT: "secondary",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const provider = getSportsProvider();
  const [recaps, total, tournaments, players] = await Promise.all([
    recapRepo.listByUser(user.id, { take: 4 }),
    recapRepo.countByUser(user.id),
    provider.getTournaments(),
    provider.getPlayers({}),
  ]);

  const tournament = tournaments[0];
  const completed = recaps.filter((r) => r.status === "COMPLETED");
  const latest = recaps[0];
  const favoriteTeam = completed.find((r) => r.team)?.team ?? null;
  const favoritePlayer = completed.find((r) => r.player)?.player ?? null;
  const topPlayers = [...players]
    .sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating)
    .slice(0, 4);

  const statCards = [
    { label: "Recaps Created", value: total, icon: Film },
    { label: "Favorite Team", value: favoriteTeam?.name ?? "—", icon: Trophy, sub: favoriteTeam?.flag },
    { label: "Favorite Player", value: favoritePlayer?.name ?? "—", icon: Star },
    {
      label: "Latest Recap",
      value: latest ? latest.title.slice(0, 18) + (latest.title.length > 18 ? "…" : "") : "—",
      icon: Clock,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {tournament ? `${tournament.name} · ${tournament.hostCountry}` : "Your recap studio"}
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <PlusCircle aria-hidden /> Create Recap
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="card-hover">
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted">
                  {s.label}
                </p>
                <p className="mt-2 text-xl font-bold">
                  {s.sub ? `${s.sub} ` : ""}
                  {s.value}
                </p>
              </div>
              <s.icon className="size-5 text-accent" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent recaps */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent recaps</CardTitle>
              <CardDescription>Your generated stories</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recaps">
                View all <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recaps.length === 0 ? (
              <EmptyState
                icon={<Film />}
                title="No recaps yet"
                description="Generate your first personalized World Cup story — it takes less than a minute."
                action={
                  <Button asChild size="sm">
                    <Link href="/create">Create My Recap</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {recaps.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/recaps/${r.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {r.tournament.name} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recommended players */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament stars</CardTitle>
            <CardDescription>Top performers this World Cup</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {topPlayers.map((p) => (
                <li key={p.player.id}>
                  <Link
                    href={`/players/${p.player.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-accent">
                        {p.player.jerseyNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{p.player.name}</p>
                        <p className="text-xs text-muted">{p.player.position}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-accent">
                      {p.goals}G {p.assists}A
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
