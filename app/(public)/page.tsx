import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Clapperboard,
  Play,
  Sparkles,
  Target,
  Trophy,
  Wand2,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/flag";
import { prisma } from "@/lib/prisma";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Stories",
    text: "Transform raw tournament data into engaging personalized narratives — structured, validated, never hallucinated.",
  },
  {
    icon: Target,
    title: "Smart Moment Detection",
    text: "An importance engine scores every event 0–100 to surface the goals, upsets, and turning points that mattered most.",
  },
  {
    icon: Clapperboard,
    title: "Automated Highlights",
    text: "Moments become a polished recap video — generated visuals, transitions, narration, and ambient audio via FFmpeg.",
  },
  {
    icon: BarChart3,
    title: "Deep Statistics",
    text: "Explore the numbers behind every performance — ratings, possession, xThreat-style match data and timelines.",
  },
];

const steps = [
  {
    icon: Trophy,
    title: "Pick your tournament",
    text: "Choose the World Cup, then the team or player whose story you want told.",
  },
  {
    icon: Wand2,
    title: "Shape your recap",
    text: "Journey type, tone, and length — the AI adapts the narrative to your taste.",
  },
  {
    icon: Clapperboard,
    title: "Watch your story",
    text: "Get a shareable recap page with the story, stats, moments — and a generated highlight video.",
  },
];

const tech = [
  "Next.js 16 + TypeScript",
  "PostgreSQL + Prisma",
  "OpenAI structured output",
  "FFmpeg video pipeline",
  "Sessions, auth, rate limits",
  "Async jobs + caching",
];

export default async function HomePage() {
  const [teams, players, matches, recaps] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.match.count(),
    prisma.recap.count(),
  ]);

  // Live-score widget — real seeded match (India's upset over USA, 2026 demo).
  const live = await prisma.match.findFirst({
    where: { tournamentId: "seed-2026", homeTeamId: "seed-2026-IND" },
    include: {
      homeTeam: true,
      awayTeam: true,
      teamStats: true,
      events: { include: { player: true, team: true }, orderBy: { minute: "desc" }, take: 3 },
    },
    orderBy: { date: "desc" },
  });
  const homeStat = live?.teamStats.find((s) => s.teamId === live.homeTeamId);
  const awayStat = live?.teamStats.find((s) => s.teamId === live.awayTeamId);

  return (
    <>
      {/* ── Hero ── */}
      <section className="pitch-texture relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-28">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-xs font-medium text-sky-300">
            <Sparkles size={14} /> AI-powered · Video · Statistics
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Your World Cup.
            <br />
            <span className="bg-gradient-to-r from-gold via-amber-300 to-emerald-400 bg-clip-text text-transparent">
              Your Story.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Turn matches, statistics, unforgettable moments, and player
            performances into a personalized AI-powered tournament recap.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/create" size="lg">
              Create My Recap <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/demo" variant="secondary" size="lg">
              <Play size={18} /> Explore Demo
            </ButtonLink>
          </div>

          {/* Stats cards */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [teams, "TEAMS"],
              [matches, "MATCHES"],
              [players, "PLAYERS"],
              [recaps, "RECAPS"],
            ].map(([n, label]) => (
              <div key={label} className="card px-4 py-5 text-center">
                <div className="text-3xl font-extrabold text-gold">{n}</div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live score strip ── */}
      {live && (
        <section className="border-t border-line/60">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line/60 px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Featured Match
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  {live.stage === "GROUP" ? `Group ${live.groupName ?? ""}` : live.stage.replace(/_/g, " ")}
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-400">FT</span>
                </span>
              </div>
              <div className="px-5 py-6">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Flag country={live.homeTeam.country} className="h-6 w-9 rounded" />
                    <span className="text-lg font-bold">{live.homeTeam.shortName}</span>
                  </div>
                  <div className="rounded-xl bg-black/40 px-5 py-2 text-center font-mono text-3xl font-extrabold">
                    {live.homeScore} : {live.awayScore}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-lg font-bold">{live.awayTeam.shortName}</span>
                    <Flag country={live.awayTeam.country} className="h-6 w-9 rounded" />
                  </div>
                </div>
                {homeStat && awayStat && (
                  <div className="mt-6 space-y-2.5 text-xs text-slate-400">
                    <div className="flex justify-between font-mono">
                      <span>{Math.round(homeStat.possession)}%</span>
                      <span className="uppercase tracking-wider text-slate-500">Possession</span>
                      <span>{Math.round(awayStat.possession)}%</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="bg-gold" style={{ width: `${homeStat.possession}%` }} />
                      <div className="bg-sky-500" style={{ width: `${awayStat.possession}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono">
                      <div>
                        <span className="text-white">{homeStat.shots} ({homeStat.shotsOnTarget})</span>
                        <span className="mx-2 text-slate-600">—</span>
                        <span className="text-white">{awayStat.shots} ({awayStat.shotsOnTarget})</span>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Shots (OT)</p>
                      </div>
                      <div>
                        <span className="text-white">{homeStat.corners}</span>
                        <span className="mx-2 text-slate-600">—</span>
                        <span className="text-white">{awayStat.corners}</span>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Corners</p>
                      </div>
                      <div>
                        <span className="text-white">{homeStat.fouls}</span>
                        <span className="mx-2 text-slate-600">—</span>
                        <span className="text-white">{awayStat.fouls}</span>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Fouls</p>
                      </div>
                    </div>
                  </div>
                )}
                {live.events.length > 0 && (
                  <div className="mt-5 space-y-2 border-t border-line/50 pt-4">
                    {live.events.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 text-sm">
                        <span className="w-10 font-mono text-xs text-slate-500">
                          {e.minute}{e.extraMinute ? `+${e.extraMinute}` : ""}&rsquo;
                        </span>
                        <span className={`h-2 w-2 rounded-full ${e.type.includes("GOAL") ? "bg-emerald-400" : "bg-yellow-400"}`} />
                        <span className="text-slate-300">
                          {e.description ?? `${e.player?.name ?? e.team?.name ?? ""} — ${e.type.replace(/_/g, " ").toLowerCase()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            From kick-off to credits in three steps
          </h2>
          <p className="mt-3 text-center text-sm text-muted">
            No uploads, no editing software — just pick, generate, and watch.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title} className="relative overflow-hidden p-6" hover>
                <span className="absolute -right-2 -top-4 select-none text-[88px] font-extrabold leading-none text-white/[0.04]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <s.icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </Card>
            ))}
          </div>

          {/* Example recap card */}
          <Link href="/demo" className="mt-8 block">
            <Card hover className="flex flex-col items-center gap-6 p-6 sm:flex-row">
              <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-line bg-surface-2">
                <Flag country="India" className="h-8 w-12 rounded" />
                <span className="mt-1.5 text-xs font-medium text-slate-400">India</span>
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xs font-medium uppercase tracking-wider text-sky-400">Example recap</p>
                <h3 className="mt-1 text-xl font-bold">India — FIFA World Cup 2026 Recap</h3>
                <p className="mt-1 text-sm text-muted">
                  Story, moments, statistics and a generated highlight video — watch the real output.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-gold">
                Watch it <ArrowRight size={18} />
              </span>
            </Card>
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-line/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Not a wrapper. A real media pipeline.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="p-6" hover>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </Card>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center gap-5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {tech.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
            <Link
              href="/engineering"
              className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300"
            >
              Curious how it works? Read the engineering deep-dive <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
