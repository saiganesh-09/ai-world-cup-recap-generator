import type { Metadata } from "next";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Engineering — Architecture & Design Decisions",
  description:
    "Technical architecture of the AI World Cup Recap Generator: Next.js, PostgreSQL, structured AI output, background jobs, FFmpeg pipeline.",
};

const sections = [
  {
    title: "Application architecture",
    body: `Next.js App Router serves the UI and the API from one deployable. React Server Components render all data-heavy pages (teams, players, recaps) on the server; client components are used only where interactivity demands it (wizard, polling, charts).`,
    bullets: [
      "Route handlers are thin — validation + auth + delegation",
      "services/ holds business logic; repositories/ holds all Prisma access",
      "Zod validates every boundary: request bodies, env vars, AI output",
    ],
  },
  {
    title: "Data layer",
    body: `PostgreSQL with Prisma. The schema models the domain relationally: tournaments, teams, players, matches, match events, per-match stats, recaps, moments, jobs and a transcript cache.`,
    bullets: [
      "Composite PKs on join/stat tables prevent duplicate rows",
      "Indexes on match.tournamentId, recap.userId, job.status, player.name",
      "Aggregate queries use groupBy/include to avoid N+1 patterns",
      "Reproducible seed: npm run db:seed (2022 real data + 2026 simulation)",
    ],
  },
  {
    title: "AI pipeline — grounded, validated, resilient",
    body: `The LLM never sees raw database dumps. A context builder normalizes matches, stats and pre-scored moments into a compact RecapContext, then a prompt produces strict JSON validated against a zod schema. Malformed output never reaches the database — generation falls back to a deterministic writer so a recap always completes.`,
    bullets: [
      "Structured output (JSON mode) + schema validation = hallucination control",
      "Facts come only from the provided context, never from model memory",
      "Tone/type/length map to explicit prompt instructions",
      "Same RecapStory schema whether OpenAI or fallback wrote it",
    ],
  },
  {
    title: "Moment importance engine",
    body: `Every match event is replayed against a running scoreline and scored 0–100: event type, stage weight (final > group), timing (90+ winners), game-state impact (equalizer vs go-ahead), shootout drama, and relevance to the chosen team/player. Only the top moments reach the story and video.`,
  },
  {
    title: "Async jobs & video rendering",
    body: `Generation runs as a GenerationJob in a DB-backed queue — the POST returns 202 immediately and the UI polls /status for real progress. A standalone worker (npm run worker) claims jobs with stale-lock recovery; dev mode runs them inline. The video stage renders SVG→PNG slides via sharp, synthesizes an ambient audio bed (ffmpeg lavfi), optionally mixes OpenAI TTS narration, and assembles mp4 via ffmpeg with crossfades.`,
    bullets: [
      "DB queue chosen for zero-infrastructure reliability (BullMQ/Redis upgrade path documented)",
      "FFmpeg failure degrades gracefully: xfade render → plain concat retry",
      "All media is generated — zero copyrighted footage",
    ],
  },
  {
    title: "Security & abuse protection",
    body: `bcrypt password hashing, httpOnly JWT session cookies, server-side authorization on every protected route (recaps are owner-scoped at the repository layer, not just the UI). Sliding-window rate limits on login, signup, transcription and generation. Secrets live in env vars; nothing private reaches the client.`,
  },
  {
    title: "Scaling path",
    body: `Horizontal: stateless Next.js instances behind a load balancer; workers scale independently (claimNext is safe under concurrency via status-transition claiming). At 1,000 concurrent generations: move the queue to Redis/BullMQ, add S3 + CDN for media, push AI calls behind a request queue with backoff, and cache provider reads in Redis.`,
  },
];

const stackRows: [string, string][] = [
  ["Frontend", "Next.js 16 (App Router, RSC) · React 19 · Tailwind v4 · Recharts"],
  ["Backend", "Next.js route handlers · service + repository layers"],
  ["Database", "PostgreSQL 16 · Prisma ORM · migrations + seed"],
  ["AI", "OpenAI structured output · Whisper STT · TTS narration · deterministic fallback"],
  ["Media", "sharp (SVG→PNG) · ffmpeg-static · procedural audio"],
  ["Jobs", "DB-backed queue · standalone tsx worker · stale-lock recovery"],
  ["Auth", "bcrypt + JWT session cookie (jose) · server-side authorization"],
  ["Testing", "Vitest (unit/integration) · Playwright (E2E)"],
];

export default function EngineeringPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">For engineers & interviewers</p>
      <h1 className="mt-2 text-4xl font-bold">How this is built</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        A production-shaped architecture, not a demo script. Every layer is
        separated, validated, and replaceable — designed to be discussed.
      </p>

      {/* Architecture diagram */}
      <Card className="mt-10 overflow-x-auto p-6">
        <pre className="font-mono text-xs leading-6 text-slate-300 sm:text-sm">{`
 Browser (RSC + client islands)
        │
        ▼
 ┌─────────────────┐      ┌──────────────┐
 │  Next.js API    │─────▶│ Service layer│
 │  (zod + auth)   │      │ (use-cases)  │
 └─────────────────┘      └──────┬───────┘
        │                       │
        ▼                       ▼
 ┌─────────────┐        ┌──────────────┐
 │ Rate limiter│        │ Repositories │────▶ PostgreSQL
 └─────────────┘        └──────────────┘      (Prisma)
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
 ┌─────────────┐        ┌──────────────┐        ┌────────────────┐
 │ AI engine   │        │ Moment engine│        │ Job queue (DB) │
 │ OpenAI+zod  │        │ 0–100 scorer │        └──────┬─────────┘
 └─────────────┘        └──────────────┘               │
        │                                              ▼
        │                                       ┌──────────────┐
        │                                       │ Worker (tsx) │
        │                                       └──────┬───────┘
        │                                              ▼
        │                                       ┌──────────────┐
        └──────────────────────────────────────▶│ FFmpeg + TTS │──▶ mp4
                                                └──────────────┘`}</pre>
      </Card>

      {/* Stack table */}
      <Card className="mt-8 divide-y divide-line/50">
        {stackRows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-6 py-3.5 sm:grid-cols-[160px_1fr]">
            <span className="text-sm font-semibold text-gold">{k}</span>
            <span className="text-sm text-slate-300">{v}</span>
          </div>
        ))}
      </Card>

      {/* Sections */}
      <div className="mt-10 space-y-6">
        {sections.map((s) => (
          <Card key={s.title} className="p-6">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
            {s.bullets && (
              <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-gold">▸</span> {b}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
