import Link from "next/link";
import {
  Brain,
  Clapperboard,
  Sparkles,
  Target,
  BarChart3,
  ArrowRight,
  Play,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Stories",
    text: "Transform raw tournament data into engaging personalized narratives.",
  },
  {
    icon: Target,
    title: "Smart Moment Detection",
    text: "Automatically identify the matches, goals, performances, and turning points that mattered most.",
  },
  {
    icon: Clapperboard,
    title: "Automated Highlights",
    text: "Turn selected moments into a polished recap video — generated frame by frame.",
  },
  {
    icon: BarChart3,
    title: "Deep Statistics",
    text: "Explore the numbers behind every performance, from ratings to possession trends.",
  },
];

const steps = [
  { n: "01", title: "Pick your tournament", text: "Choose a World Cup, then a team or a player." },
  { n: "02", title: "Shape your story", text: "Select the recap type, tone, and length." },
  { n: "03", title: "Watch it come alive", text: "AI writes the story; FFmpeg builds the video." },
];

export default async function HomePage() {
  const [teams, players, matches, recaps] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.match.count(),
    prisma.recap.count(),
  ]);

  return (
    <>
        {/* ── Hero ── */}
        <section className="pitch-texture relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 text-center">
            <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
              <Sparkles size={14} /> AI-powered tournament storytelling
            </p>
            <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight sm:text-7xl">
              Your World Cup.{" "}
              <span className="bg-gradient-to-r from-gold to-amber-200 bg-clip-text text-transparent">
                Your Story.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted leading-relaxed">
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
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                [teams, "teams"],
                [players, "players"],
                [matches, "matches"],
                [recaps, "recaps made"],
              ].map(([n, label]) => (
                <div key={label as string} className="text-center">
                  <div className="text-3xl font-extrabold text-white">{n}</div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-t border-line/60">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-bold">Three steps to your story</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {steps.map((s) => (
                <Card key={s.n} className="p-6" hover>
                  <div className="text-sm font-bold text-gold">{s.n}</div>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{s.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="border-t border-line/60 bg-surface/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-bold">Built like a real product</h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted">
              Not a chatbot wrapper — a full pipeline from raw match data to a
              rendered, shareable highlight video.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title} className="p-6" hover>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                    <f.icon size={22} />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{f.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tech strip ── */}
        <section className="border-t border-line/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Powered by a real engineering stack
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-400">
                {["Next.js", "TypeScript", "PostgreSQL", "Prisma", "OpenAI", "Whisper", "FFmpeg", "Tailwind"].map(
                  (t) => (
                    <span key={t}>{t}</span>
                  ),
                )}
              </div>
              <Link
                href="/engineering"
                className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300"
              >
                See the architecture <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-line/60 bg-gradient-to-b from-surface/50 to-pitch">
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Relive the tournament your way</h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Pick a team. Pick a hero. Get a story worth sharing.
            </p>
            <ButtonLink href="/create" size="lg" className="mt-8">
              Create My Recap <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </section>
    </>
  );
}
