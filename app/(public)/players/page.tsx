import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchInput } from "@/components/search-input";
import { Badge, Card } from "@/components/ui/primitives";
import { playerRepo } from "@/repositories/sports.repository";
import type { Position } from "@prisma/client";

export const metadata: Metadata = { title: "Players" };

const POSITIONS: { value: Position | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "GK", label: "Goalkeepers" },
  { value: "DF", label: "Defenders" },
  { value: "MF", label: "Midfielders" },
  { value: "FW", label: "Forwards" },
];

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const position = typeof sp.position === "string" && ["GK", "DF", "MF", "FW"].includes(sp.position)
    ? (sp.position as Position)
    : undefined;

  const players = await playerRepo.list({ search, position, take: 200 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Players</h1>
      <p className="mt-1 text-sm text-muted">{players.length} players in the database</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-80">
          <Suspense fallback={null}>
            <SearchInput placeholder="Search players…" />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => {
            const active = (position ?? "") === p.value;
            return (
              <Link key={p.label} href={p.value ? `/players?position=${p.value}` : "/players"}>
                <Badge color={active ? "gold" : "slate"} className="cursor-pointer px-3 py-1">
                  {p.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <Link key={p.id} href={`/players/${p.id}`}>
            <Card hover className="flex items-center gap-4 p-4">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full font-mono text-sm font-bold text-white"
                style={{ backgroundColor: p.team.primaryColor }}
              >
                {p.jerseyNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.team.flagEmoji} {p.team.name}
                </p>
              </div>
              <Badge>{p.position}</Badge>
            </Card>
          </Link>
        ))}
        {players.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted">
            No players found{search ? ` for “${search}”` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
