import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchInput } from "@/components/search-input";
import { Card, TeamCrest, Badge } from "@/components/ui/primitives";
import { teamRepo, tournamentRepo } from "@/repositories/sports.repository";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const tournamentId = typeof sp.tournament === "string" ? sp.tournament : undefined;

  const [teams, tournaments] = await Promise.all([
    teamRepo.list({ search, tournamentId, take: 200 }),
    tournamentRepo.list(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Teams</h1>
      <p className="mt-1 text-sm text-muted">{teams.length} national teams in the database</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-80">
          <Suspense fallback={null}>
            <SearchInput placeholder="Search teams…" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/teams">
            <Badge color={!tournamentId ? "gold" : "slate"} className="cursor-pointer px-3 py-1">All</Badge>
          </Link>
          {tournaments.map((t) => (
            <Link key={t.id} href={`/teams?tournament=${t.id}`}>
              <Badge color={tournamentId === t.id ? "gold" : "slate"} className="cursor-pointer px-3 py-1">
                {t.year}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`}>
            <Card hover className="flex items-center gap-3 p-4">
              <TeamCrest short={t.shortName} color={t.primaryColor} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{t.flagEmoji} {t.name}</p>
                <p className="text-xs text-slate-500">{t._count.players} players</p>
              </div>
            </Card>
          </Link>
        ))}
        {teams.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted">
            No teams found{search ? ` for “${search}”` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
