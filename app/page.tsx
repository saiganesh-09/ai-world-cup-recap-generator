import Link from "next/link";
import {
  Sparkles,
  Film,
  BarChart3,
  BrainCircuit,
  ArrowRight,
  Trophy,
  MousePointerClick,
  Clapperboard,
  Play,
  ShieldCheck,
  Database,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

export const revalidate = 3600;

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Stories",
    desc: "Transform raw tournament data into engaging personalized narratives — structured, validated, never hallucinated.",
  },
  {
    icon: Sparkles,
    title: "Smart Moment Detection",
    desc: "An importance engine scores every event 0–100 to surface the goals, upsets, and turning points that mattered most.",
  },
  {
    icon: Film,
    title: "Automated Highlights",
    desc: "Moments become a polished recap video — generated visuals, transitions, narration, and ambient audio via FFmpeg.",
  },
  {
    icon: BarChart3,
    title: "Deep Statistics",
    desc: "Explore the numbers behind every performance — ratings, possession, xThreat-style match data and timelines.",
  },
];

const STEPS = [
  {
    icon: Trophy,
    step: "01",
    title: "Pick your tournament",
    desc: "Choose the World Cup, then the team or player whose story you want told.",
  },
  {
    icon: MousePointerClick,
    step: "02",
    title: "Shape your recap",
    desc: "Journey type, tone, and length — the AI adapts the narrative to your taste.",
  },
  {
    icon: Clapperboard,
    step: "03",
    title: "Watch your story",
    desc: "Get a shareable recap page with the story, stats, moments — and a generated highlight video.",
  },
];

const TECH = [
  { icon: Cpu, label: "Next.js 16 + TypeScript" },
  { icon: Database, label: "PostgreSQL + Prisma" },
  { icon: BrainCircuit, label: "OpenAI structured output" },
  { icon: Film, label: "FFmpeg video pipeline" },
  { icon: ShieldCheck, label: "Sessions, auth, rate limits" },
  { icon: BarChart3, label: "Async jobs + caching" },
];

export default async function LandingPage() {
  // Live demo stats for the "statistics preview" band — cheap queries,
  // with fallbacks so the page never hard-fails on DB issues.
  const [teamCount, matchCount, playerCount, showcase] = await Promise.all([
    prisma.team.count().catch(() => 8),
    prisma.match.count().catch(() => 16),
    prisma.player.count().catch(() => 64),
    prisma.recap
      .findFirst({
        where: { status: "COMPLETED", isPublic: true },
        orderBy: { createdAt: "desc" },
        select: { shareId: true, title: true, thumbnailUrl: true, durationSec: true },
      })
      .catch(() => null),
  ]);

  return (
    <main>
      {/* ── Nav ── */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-bold tracking-tight">
          <Trophy className="size-5 text-accent" aria-hidden />
          <span>WC Recap<span className="text-accent">.ai</span></span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Primary">
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
            <Link href="/engineering">Engineering</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/create">Create My Recap</Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-16 text-center md:pt-24">
        <Badge variant="secondary" className="mb-6 animate-fade-in-up">
          <Sparkles className="size-3" aria-hidden /> AI-powered · Video · Statistics
        </Badge>
        <h1
          className="animate-fade-in-up text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl"
          style={{ animationDelay: "60ms" }}
        >
          Your World Cup.
          <br />
          <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
            Your Story.
          </span>
        </h1>
        <p
          className="mt-6 max-w-2xl animate-fade-in-up text-lg text-muted md:text-xl"
          style={{ animationDelay: "120ms" }}
        >
          Turn matches, statistics, unforgettable moments, and player
          performances into a personalized AI-powered tournament recap.
        </p>
        <div
          className="mt-10 flex animate-fade-in-up flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "180ms" }}
        >
          <Button size="lg" asChild>
            <Link href="/create">
              Create My Recap <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login?demo=1">
              <Play aria-hidden /> Explore Demo
            </Link>
          </Button>
        </div>

        {/* Statistics preview */}
        <div
          className="mt-16 grid w-full max-w-lg animate-fade-in-up grid-cols-3 gap-4"
          style={{ animationDelay: "240ms" }}
        >
          {[
            { label: "Teams", value: teamCount },
            { label: "Matches", value: matchCount },
            { label: "Players", value: playerCount },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-surface/60 px-4 py-5"
            >
              <div className="text-3xl font-extrabold text-accent">{s.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-border bg-surface/40 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            From kick-off to credits in three steps
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted">
            No uploads, no editing software — just pick, generate, and watch.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <Card key={s.step} className="card-hover relative overflow-hidden">
                <div className="absolute right-4 top-3 text-5xl font-black text-foreground/5">
                  {s.step}
                </div>
                <CardContent className="p-6">
                  <s.icon className="size-8 text-accent" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example recap ── */}
      {showcase && (
        <section className="mx-auto w-full max-w-4xl px-6 pb-20">
          <Link href={`/share/${showcase.shareId}`} className="card-hover group block">
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="relative aspect-video bg-surface-2 md:aspect-auto">
                  {showcase.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={showcase.thumbnailUrl}
                      alt={`${showcase.title} — generated video thumbnail`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="size-10 text-muted" aria-hidden />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="size-12 text-white" aria-hidden />
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
                  <Badge variant="secondary" className="w-fit">
                    <Clapperboard className="size-3" aria-hidden /> Example recap
                  </Badge>
                  <h3 className="text-xl font-bold">{showcase.title}</h3>
                  <p className="text-sm text-muted">
                    Story, moments, statistics and a generated highlight video —
                    watch the real output.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    Watch it <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* ── Features ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Not a wrapper. A real media pipeline.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="card-hover">
              <CardContent className="p-6">
                <f.icon className="size-7 text-accent" aria-hidden />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Tech band ── */}
      <section className="border-y border-border bg-surface/40 py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {TECH.map((t) => (
              <Badge key={t.label} variant="secondary" className="px-4 py-2 text-sm">
                <t.icon className="size-3.5" aria-hidden /> {t.label}
              </Badge>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Curious how it works?{" "}
            <Link href="/engineering" className="text-accent underline-offset-4 hover:underline">
              Read the engineering deep-dive →
            </Link>
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-24 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight">
          Ready to relive the tournament?
        </h2>
        <p className="mt-4 text-lg text-muted">
          Pick a team. Pick a player. Get a story worth sharing.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/create">
            Create My Recap <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted sm:flex-row">
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-accent" aria-hidden /> AI World Cup Recap
            Generator
          </span>
          <span>
            Demo dataset only — no copyrighted broadcast footage is used.
          </span>
        </div>
      </footer>
    </main>
  );
}
