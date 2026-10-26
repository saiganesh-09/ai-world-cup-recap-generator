import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Star, TrendingUp, Trophy, Video } from "lucide-react";
import { RecapCard } from "@/components/recap/recap-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, TeamCrest } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recapRepo } from "@/repositories/recap.repository";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const recaps = await recapRepo.forUser(user.id);

  // Favorite team = most-used across the user's recaps.
  const teamCounts = new Map<string, number>();
  for (const r of recaps) if (r.teamId) teamCounts.set(r.teamId, (teamCounts.get(r.teamId) ?? 0) + 1);
  const favoriteTeamId = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const favoriteTeam = favoriteTeamId ? recaps.find((r) => r.teamId === favoriteTeamId)?.team : null;

  // Recommended players — highest tournament ratings.
  const topPlayers = await prisma.playerMatchStat.groupBy({
    by: ["playerId"],
    _avg: { rating: true },
    _sum: { goals: true },
    orderBy: { _avg: { rating: "desc" } },
    take: 6,
  });
  const recommended = await prisma.player.findMany({
    where: { id: { in: topPlayers.map((p) => p.playerId) } },
    include: { team: true },
  });
  const recommendedSorted = topPlayers
    .map((t) => ({ player: recommended.find((p) => p.id === t.playerId)!, rating: t._avg.rating, goals: t._sum.goals }))
    .filter((x) => x.player);

  const ready = recaps.filter((r) => r.status === "READY").length;
  const latest = recaps[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">Here&rsquo;s your World Cup at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold"><Video size={20} /></span>
            <div>
              <div className="text-2xl font-bold">{recaps.length}</div>
              <div className="text-xs text-muted">Recaps created</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp size={20} /></span>
            <div>
              <div className="text-2xl font-bold">{ready}</div>
              <div className="text-xs text-muted">Ready to watch</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            {favoriteTeam ? (
              <TeamCrest short={favoriteTeam.shortName} color={favoriteTeam.primaryColor} size={40} />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><Trophy size={20} /></span>
            )}
            <div>
              <div className="truncate text-sm font-bold">{favoriteTeam?.name ?? "—"}</div>
              <div className="text-xs text-muted">Favorite team</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><Star size={20} /></span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">
                {latest ? latest.title : "None yet"}
              </div>
              <div className="text-xs text-muted">Latest recap</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent recaps */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent recaps</h2>
            <ButtonLink href="/create" variant="secondary" size="sm">
              <Clapperboard size={15} /> New recap
            </ButtonLink>
          </div>
          {recaps.length === 0 ? (
            <Card className="mt-4 p-10 text-center">
              <p className="text-sm text-muted">No recaps yet — create your first story.</p>
              <ButtonLink href="/create" className="mt-4">Create My Recap</ButtonLink>
            </Card>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {recaps.slice(0, 4).map((r) => (
                <RecapCard key={r.id} recap={r} />
              ))}
            </div>
          )}
        </section>

        {/* Recommended players */}
        <section>
          <h2 className="font-semibold">Tournament standouts</h2>
          <Card className="mt-4 divide-y divide-line/50">
            {recommendedSorted.map(({ player, rating, goals }) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
              >
                <span className="w-6 text-center font-mono text-xs text-slate-500">{player.jerseyNumber}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{player.name}</p>
                  <p className="text-xs text-slate-500">{player.team.name}</p>
                </div>
                <div className="text-right">
                  <Badge color="gold">{rating?.toFixed(1)}</Badge>
                  <p className="mt-0.5 text-[10px] text-slate-500">{goals} goals</p>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
