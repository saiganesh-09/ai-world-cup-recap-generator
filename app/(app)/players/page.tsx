import Link from "next/link";
import { Suspense } from "react";
import { getSportsProvider } from "@/services/sports/provider";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { User, Star } from "lucide-react";
import { Flag } from "@/components/flag";
import { POSITION_LABELS } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Players" };

const POSITIONS = ["ALL", "GK", "DF", "MF", "FW"] as const;

async function PlayerGrid({
  q,
  position,
}: {
  q?: string;
  position?: string;
}) {
  const provider = getSportsProvider();
  let players = await provider.getPlayers({});
  if (position && position !== "ALL") {
    players = players.filter((p) => p.player.position === position);
  }
  if (q) {
    players = players.filter((p) => p.player.name.toLowerCase().includes(q));
  }
  players.sort((a, b) => b.goals - a.goals || b.avgRating - a.avgRating);

  const teamNames = new Map(
    (await prisma.team.findMany()).map((t) => [t.id, t]),
  );

  if (players.length === 0) {
    return (
      <EmptyState
        icon={<User />}
        title="No players found"
        description="Try a different search or filter."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {players.map((p) => {
        const team = teamNames.get(p.teamId);
        return (
          <Link key={p.player.id} href={`/players/${p.player.id}`} className="card-hover block">
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-accent">
                    {p.player.jerseyNumber}
                  </span>
                  {p.player.isStar && (
                    <Star className="size-4 fill-accent text-accent" aria-label="Star player" />
                  )}
                </div>
                <h3 className="mt-3 font-bold leading-tight">{p.player.name}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {team && (
                    <Flag code={team.shortName} name={team.name} className="mr-1" />
                  )}
                  {team?.name} · {POSITION_LABELS[p.player.position]}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
                  <div>
                    <p className="font-bold text-accent">{p.goals}</p>
                    <p className="text-muted">Goals</p>
                  </div>
                  <div>
                    <p className="font-bold">{p.assists}</p>
                    <p className="text-muted">Assists</p>
                  </div>
                  <div>
                    <p className="font-bold">{p.avgRating.toFixed(1)}</p>
                    <p className="text-muted">Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pos?: string }>;
}) {
  const { q, pos } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="mt-1 text-sm text-muted">Tournament performers</p>
        </div>
        <SearchInput placeholder="Search players…" />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Position filter">
        {POSITIONS.map((p) => (
          <Link
            key={p}
            href={`/players${p === "ALL" ? "" : `?pos=${p}`}`}
            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              (pos ?? "ALL") === p
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-accent/40"
            }`}
          >
            {p === "ALL" ? "All" : POSITION_LABELS[p] + "s"}
          </Link>
        ))}
      </div>
      <Suspense>
        <PlayerGrid q={q?.toLowerCase()} position={pos} />
      </Suspense>
    </div>
  );
}
