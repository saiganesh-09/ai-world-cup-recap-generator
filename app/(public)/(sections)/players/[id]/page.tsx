import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RatingChart } from "@/components/stats/rating-chart";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/flag";
import { playerRepo } from "@/repositories/sports.repository";
import { matchResult } from "@/services/stats.service";

export async function generateMetadata(ctx: PageProps<"/players/[id]">): Promise<Metadata> {
  const { id } = await ctx.params;
  const player = await playerRepo.byId(id);
  return { title: player ? `${player.name} — Player profile` : "Player" };
}

export default async function PlayerPage(ctx: PageProps<"/players/[id]">) {
  const { id } = await ctx.params;
  const player = await playerRepo.byId(id);
  if (!player) notFound();
  const stats = await playerRepo.statsForPlayer(id);

  const agg = stats.reduce(
    (a, s) => ({
      apps: a.apps + 1,
      goals: a.goals + s.goals,
      assists: a.assists + s.assists,
      minutes: a.minutes + s.minutes,
      shots: a.shots + s.shots,
      tackles: a.tackles + s.tackles,
      ratingSum: a.ratingSum + s.rating,
    }),
    { apps: 0, goals: 0, assists: 0, minutes: 0, shots: 0, tackles: 0, ratingSum: 0 },
  );
  const avgRating = agg.apps ? Math.round((agg.ratingSum / agg.apps) * 100) / 100 : 0;

  const chartData = stats.map((s, i) => ({
    label: `M${i + 1}`,
    rating: s.rating,
  }));

  const POS: Record<string, string> = { GK: "Goalkeeper", DF: "Defender", MF: "Midfielder", FW: "Forward" };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-xl font-bold text-white"
            style={{ backgroundColor: player.team.primaryColor }}
          >
            {player.jerseyNumber}
          </span>
          <div>
            <h1 className="text-3xl font-bold">{player.name}</h1>
            <p className="text-sm text-muted">
              {POS[player.position]} · <Flag country={player.team.country} />{" "}
              <a href={`/teams/${player.teamId}`} className="hover:text-sky-400">{player.team.name}</a>
              {player.age ? ` · ${player.age} yrs` : ""}
            </p>
          </div>
        </div>
        <ButtonLink href="/create" size="sm">Create player recap</ButtonLink>
      </div>

      {/* Stats strip */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Apps", agg.apps],
          ["Goals", agg.goals],
          ["Assists", agg.assists],
          ["Minutes", agg.minutes],
          ["Shots", agg.shots],
          ["Avg rating", avgRating.toFixed(2)],
        ].map(([k, v]) => (
          <Card key={k} className="p-4 text-center">
            <div className="text-2xl font-extrabold text-white">{v}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{k}</div>
          </Card>
        ))}
      </div>

      {/* Rating chart */}
      {chartData.length > 1 && (
        <Card className="mt-8 p-5">
          <h2 className="font-semibold">Match-by-match rating</h2>
          <div className="mt-4">
            <RatingChart data={chartData} />
          </div>
        </Card>
      )}

      {/* Match log */}
      <section className="mt-8">
        <h2 className="font-semibold">Tournament timeline</h2>
        <Card className="mt-4 divide-y divide-line/50">
          {stats.map((s) => {
            const m = s.match;
            const r = matchResult(m, player.teamId);
            const opp = m.homeTeamId === player.teamId ? m.awayTeam : m.homeTeam;
            return (
              <div key={s.matchId} className="flex items-center gap-4 px-5 py-3">
                <Badge color={r === "W" ? "green" : r === "L" ? "red" : "slate"} className="w-8 justify-center">
                  {r}
                </Badge>
                <div className="flex-1">
                  <span className="text-sm">vs {opp.name}</span>
                  <p className="text-xs text-slate-500">
                    {m.homeTeam.shortName} {m.homeScore}–{m.awayScore} {m.awayTeam.shortName} ·{" "}
                    {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {s.goals > 0 && <span className="mr-2 text-emerald-400">⚽ {s.goals}</span>}
                  {s.assists > 0 && <span className="mr-2 text-sky-400">🅰 {s.assists}</span>}
                  <Badge color="gold">{s.rating.toFixed(1)}</Badge>
                </div>
              </div>
            );
          })}
          {stats.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted">No match data for this player.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
