import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, TeamCrest } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/flag";
import { teamRepo } from "@/repositories/sports.repository";
import { matchResult, teamStats } from "@/services/stats.service";

export async function generateMetadata(ctx: PageProps<"/teams/[id]">): Promise<Metadata> {
  const { id } = await ctx.params;
  const team = await teamRepo.byId(id);
  return { title: team ? `${team.name} — Team profile` : "Team" };
}

const STAGE_NAME: Record<string, string> = {
  GROUP: "Group",
  ROUND_OF_16: "R16",
  QUARTER_FINAL: "QF",
  SEMI_FINAL: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final",
};

export default async function TeamPage(ctx: PageProps<"/teams/[id]">) {
  const { id } = await ctx.params;
  const team = await teamRepo.detail(id);
  if (!team) notFound();

  const tournamentId = team.tournaments[0]?.tournamentId;
  const matches = await teamRepo.matches(id, tournamentId);
  const stats = teamStats(matches, id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamCrest short={team.shortName} color={team.primaryColor} size={64} />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Flag country={team.country} size="lg" className="h-7 w-10" />{team.name}</h1>
            <p className="text-sm text-muted">
              {team.tournaments.map((t) => t.tournament.name).join(" · ")}
            </p>
          </div>
        </div>
        <ButtonLink href={`/create`} size="sm">Create {team.shortName} recap</ButtonLink>
      </div>

      {/* Stats strip */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Played", stats.played],
          ["Won", stats.wins],
          ["Drawn", stats.draws],
          ["Lost", stats.losses],
          ["GF", stats.goalsFor],
          ["GA", stats.goalsAgainst],
          ["Clean sheets", stats.cleanSheets],
        ].map(([k, v]) => (
          <Card key={k} className="p-4 text-center">
            <div className="text-2xl font-extrabold text-white">{v}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">{k}</div>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        {/* Matches */}
        <section className="lg:col-span-3">
          <h2 className="font-semibold">Matches</h2>
          <Card className="mt-4 divide-y divide-line/50">
            {matches.map((m) => {
              const r = matchResult(m, id);
              const opp = m.homeTeamId === id ? m.awayTeam : m.homeTeam;
              const gf = m.homeTeamId === id ? m.homeScore : m.awayScore;
              const ga = m.homeTeamId === id ? m.awayScore : m.homeScore;
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Badge
                    color={r === "W" ? "green" : r === "L" ? "red" : "slate"}
                    className="w-14 justify-center"
                  >
                    {STAGE_NAME[m.stage]}
                  </Badge>
                  <div className="flex-1">
                    <span className="text-sm flex items-center gap-2">vs <Flag country={opp.country} /> {opp.name}</span>
                    <p className="text-xs text-slate-500">
                      {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {m.venue ? ` · ${m.venue}` : ""}
                    </p>
                  </div>
                  <span className={`font-mono font-bold ${r === "W" ? "text-emerald-400" : r === "L" ? "text-red-400" : "text-slate-300"}`}>
                    {gf}–{ga}
                    {m.homePenScore != null &&
                      ` (${m.homeTeamId === id ? m.homePenScore : m.awayPenScore}–${m.homeTeamId === id ? m.awayPenScore : m.homePenScore}p)`}
                  </span>
                </div>
              );
            })}
            {matches.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted">No matches in this dataset.</p>
            )}
          </Card>
        </section>

        {/* Squad */}
        <section className="lg:col-span-2">
          <h2 className="font-semibold">Squad</h2>
          <Card className="mt-4 divide-y divide-line/50">
            {team.players.map((p) => (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <span className="w-6 text-center font-mono text-xs text-slate-500">{p.jerseyNumber}</span>
                <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                <Badge>{p.position}</Badge>
              </Link>
            ))}
            {team.players.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">Squad not seeded for this team.</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
