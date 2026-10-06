import Link from "next/link";
import {
  Trophy,
  Database,
  BrainCircuit,
  Film,
  ShieldCheck,
  Gauge,
  Workflow,
  Layers,
  Server,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Engineering Deep-Dive",
  description:
    "Architecture, AI pipeline, media processing, and scaling decisions behind the AI World Cup Recap Generator.",
};

const DIAGRAM = `Browser
   │
   ▼
Next.js 16 (App Router)
   ├─ Server Components ───────────────► PostgreSQL (Prisma)
   └─ Route Handlers (/api/*)
          │
          ▼
   Service layer
   ├─ SportsDataProvider ──► [Demo DB | API-Football]
   ├─ Moment Importance Engine (0–100 scoring)
   ├─ AI Engine ──► OpenAI (JSON mode → zod validate)
   │                 └─► deterministic fallback
   ├─ Video Pipeline ──► SVG slides → sharp PNG → FFmpeg xfade → MP4
   ├─ Transcription ──► Whisper → Transcript store
   └─ GenerationJob worker (async, real progress)`;

const SECTIONS = [
  {
    icon: Layers,
    title: "Layered architecture",
    body: [
      "Route handlers stay thin — validation, auth, and delegation only. Business logic lives in services/* (recap, ai, video, moments, sports), persistence in repositories/*, and provider specifics behind the SportsDataProvider interface. Swapping the demo dataset for API-Football changes zero downstream code.",
      "The same layering means every unit is testable in isolation: the importance engine is a pure function, the AI generator is interface-driven, and the video assembler is a black box over ffmpeg.",
    ],
  },
  {
    icon: BrainCircuit,
    title: "AI pipeline — structured, validated, honest",
    body: [
      "The model never sees raw API dumps. buildRecapContext() normalizes tournament, team, matches, events, and aggregates into a compact RecapContext. The prompt demands a fixed JSON shape; the response is parsed with zod — malformed output is rejected, one retry is attempted, then the deterministic fallback generator takes over.",
      "The fallback is not lorem ipsum: it derives every sentence from the same dataset, so a claim can never disagree with the numbers. Demo mode runs on it entirely — no API key required.",
    ],
  },
  {
    icon: Film,
    title: "Media pipeline — no copyrighted footage",
    body: [
      "Videos are assembled from generated visuals only: each slide is an SVG artboard (intro, subject card, scoreboards, key moments, stats, verdict, outro) rasterized to PNG by sharp, then composed with ffmpeg xfade transitions. Audio is either OpenAI TTS narration or a synthesized ambient pad — always a real audio track.",
      "When commentary audio is uploaded, Whisper produces timestamped segments that align to match events (minute → 60s window). Transcripts are persisted so audio is never processed twice.",
    ],
  },
  {
    icon: Workflow,
    title: "Async job architecture",
    body: [
      "POST /recaps/:id/generate creates a GenerationJob row and returns 202. A worker claims it atomically (updateMany on status=QUEUED → RUNNING), then executes the seven-stage pipeline, writing real progress to the DB. The UI polls /status — the checklist you watch is the job table, not an animation.",
      "Scale-out story: the standalone `npm run worker` polls the same table — point it at BullMQ/SQS instead and you have a worker fleet, with artifacts pushed to S3.",
    ],
  },
  {
    icon: Database,
    title: "Data model",
    body: [
      "PostgreSQL + Prisma: Tournament → Match → MatchEvent/PlayerMatchStat/TeamMatchStat, with Team and Player shared across matches. Recap → RecapMoment captures the curated story; GenerationJob tracks pipeline state; Session powers auth; Transcript + AnalyticsEvent round it out.",
      "Indexes cover the hot paths: match(tournamentId,date), playerMatchStat(playerId,matchId), recap(userId,createdAt), generationJob(status,createdAt). Reads avoid N+1 via explicit Prisma include trees.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Security & rate limits",
    body: [
      "bcrypt-hashed passwords, random 256-bit session tokens stored as SHA-256 hashes in httpOnly cookies. Every recap read/write is ownership-checked server-side. Zod validates all API input; secrets live in env vars, validated at boot.",
      "Generation endpoints are rate-limited (sliding window, in-memory — Redis-swappable) because AI + FFmpeg are expensive. Errors map to user-safe messages; stack traces stay in server logs.",
    ],
  },
  {
    icon: Gauge,
    title: "Performance",
    body: [
      "Provider responses are TTL-cached in-process; provider sync ingests API data into Postgres so reads never hit the network. List endpoints paginate; player stats aggregate in one grouped query instead of per-player fetches.",
      "Video rendering is the only slow path, which is why it's a job — page loads never wait on FFmpeg.",
    ],
  },
];

export default function EngineeringPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to home
      </Link>

      <div className="mb-4 flex items-center gap-2 font-bold tracking-tight">
        <Trophy className="size-5 text-accent" aria-hidden />
        WC Recap<span className="text-accent">.ai</span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
        Engineering deep-dive
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        This page is written for technical reviewers. It explains how the
        product is actually built — the same code you can read in the
        repository.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-4 text-accent" aria-hidden /> System overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-[#070b16] p-4 font-mono text-xs leading-relaxed text-accent-2/90">
            {DIAGRAM}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Next.js 16",
              "TypeScript",
              "PostgreSQL",
              "Prisma",
              "OpenAI",
              "Whisper",
              "FFmpeg",
              "sharp",
              "Tailwind v4",
              "zod",
              "Vitest",
            ].map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <s.icon className="size-4.5 text-accent" aria-hidden />
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-accent/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-accent" aria-hidden />
            <p className="text-sm text-muted">
              Interview talking points? Every claim on this page maps to real
              code — see the repository.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/create">Try the product</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
