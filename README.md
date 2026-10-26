# AI World Cup Recap Generator

**Your World Cup. Your Story.** — a full-stack, AI-powered platform that turns
tournament data, match events and player performances into personalized recap
narratives and automatically rendered highlight videos.

Built with **Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma ·
OpenAI · Whisper · FFmpeg**.

---

## Demo

- **Instant demo:** open `/demo` — a seeded Argentina 2022 recap, no sign-up needed.
- **Demo account:** `demo@worldcup.ai` / `demo1234` — create your own recaps
  (try *World Cup 2026 → India → Team Journey → Exciting*).

---

## Features

- **Recap wizard** — tournament → team/player → type → tone → length in 6 steps
- **AI-generated narrative** — structured JSON stories grounded in real data,
  validated against a zod schema (hallucination control)
- **Moment importance engine** — scores every match event 0–100 by stage,
  timing, game-state impact and relevance; only the best moments surface
- **Automated highlight video** — SVG→PNG slides rendered with sharp,
  crossfaded and muxed with a synthesized audio bed (and optional AI
  narration) via FFmpeg. **Zero copyrighted footage.**
- **Speech-to-text endpoint** — Whisper transcription with content-hash
  caching (demo-safe without an API key)
- **Async job pipeline** — DB-backed queue, real stage-by-stage progress,
  standalone worker + stale-job recovery
- **Full product surface** — dashboard, teams, players, tournaments,
  shareable recap pages, search & filters, auth, rate limiting, analytics

---

## Architecture

```
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
 │ Rate limiter│        │ Repositories │────▶ PostgreSQL (Prisma)
 └─────────────┘        └──────────────┘
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
                                                └──────────────┘
```

**Layering:** route handlers are thin (validate → authorize → delegate).
`services/` owns business logic. `repositories/` owns every Prisma call.
`lib/` owns cross-cutting infra (auth, errors, rate limit, env).

```
app/            routes (App Router) — (public) vs (app) route groups
components/     UI — layout, primitives, wizard, recap, stats
services/       sports provider, AI engine, moment engine, video, context
repositories/   data access (sports, recap/job)
workers/        standalone job processor (npm run worker)
prisma/         schema, migrations, seed + tournament datasets
tests/          Vitest unit tests + Playwright E2E
types/          shared domain types
lib/            env, prisma, auth, errors, api-response, rate-limit
```

---

## Tech stack & key decisions

| Area | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, RSC | One deployable for UI+API; server components keep data fetching off the client |
| DB | PostgreSQL + Prisma | Relational domain (matches→events→stats); Neon/Supabase-ready |
| Jobs | DB-backed queue + `tsx` worker | Zero-infra reliability; `claimNext` is concurrency-safe; BullMQ/Redis is the documented scale-up |
| AI | OpenAI JSON mode + zod | Structured output validated before persistence — malformed AI output never reaches users |
| Video | sharp (SVG→PNG) + ffmpeg-static | Fully generated media, legally safe, runs anywhere |
| Audio | ffmpeg lavfi synth + optional OpenAI TTS | Always-available music bed; narration when a key exists |
| Auth | bcrypt + JWT httpOnly cookie (jose) | No external auth dependency; server-side checks on every route |
| Testing | Vitest + Playwright | Unit for engines/schemas, E2E for the golden path |

**Graceful degradation is a feature:** without `OPENAI_API_KEY` a
deterministic writer produces the same validated `RecapStory` schema;
without `SPORTS_API_KEY` seeded data serves everything; without a worker,
jobs run inline in dev. The product always works.

---

## Database schema

`User` — credentials, profile, owns recaps
`Tournament` ↔ `TournamentTeam` ↔ `Team` → `Player`
`Match` → `MatchEvent` (goals, cards, penalties, milestones)
`PlayerMatchStat`, `TeamMatchStat` — per-match performance rows (composite PKs)
`Recap` → `RecapMoment` (scored highlights), `GenerationJob` (queue row)
`Transcript` — Whisper cache keyed by audio SHA-256
`AnalyticsEvent` — allowlisted product events

Indexes on `match.tournamentId`, `match.homeTeamId/awayTeamId`,
`player.teamId`, `recap.userId`, `generationJob.status`,
`matchEvent.matchId`, `analyticsEvent.event+createdAt`. Composite primary
keys on `TournamentTeam`, `PlayerMatchStat`, `TeamMatchStat` guarantee
idempotent seeding.

---

## API

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create account (zod-validated, rate-limited) |
| POST | `/api/auth/login` | – | Sign in (generic error — no user enumeration) |
| POST | `/api/auth/logout` | ✓ | Sign out |
| GET | `/api/auth/me` | – | Current user |
| GET | `/api/tournaments` | – | List tournaments |
| GET | `/api/tournaments/:id` | – | Tournament + teams |
| GET | `/api/teams?tournamentId=&search=` | – | List/search teams |
| GET | `/api/teams/:id` | – | Team detail, matches, stats |
| GET | `/api/players?teamId=&search=&position=` | – | List/filter players |
| GET | `/api/players/:id` | – | Player detail + match log |
| GET | `/api/matches/:id` | – | Match + events |
| POST | `/api/recaps` | ✓ | Create recap draft |
| GET | `/api/recaps` | ✓ | List *own* recaps |
| GET | `/api/recaps/:id` | ✓ (owner) | Recap detail |
| DELETE | `/api/recaps/:id` | ✓ (owner) | Delete recap |
| POST | `/api/recaps/:id/generate` | ✓ (owner) | Enqueue generation (202, rate-limited) |
| GET | `/api/recaps/:id/status` | ✓ (owner) | Job progress poll |
| POST | `/api/transcription` | ✓ | Whisper STT (hash-cached, demo-safe) |
| POST | `/api/analytics` | – | Track allowlisted events |

Response envelope: `{ data }` on success, `{ error: { message } }` on failure.
All inputs zod-validated; errors map to typed `AppError` subclasses —
internal details are logged server-side, never leaked.

---

## Generation pipeline

```
User selection → validate → create Recap(DRAFT) + GenerationJob
      → 202 Accepted (browser never waits)
Worker claims job →
  COLLECTING_DATA      fetch tournament/team/player/matches/events
  ANALYZING_PERFORMANCES aggregate team + player statistics
  FINDING_MOMENTS      replay scorelines, score events 0–100, keep top-N
  WRITING_STORY        normalized context → AI → zod-validated RecapStory
  PREPARING_VISUALS    SVG slide designs → PNG frames (sharp)
  RENDERING_VIDEO      xfade assembly + synthesized audio → mp4 (FFmpeg)
  FINALIZING           persist videoUrl, thumbnail, moments → READY
```

UI polls `/api/recaps/:id/status` every 2s — every stage shown is a real
backend transition, never a fake timer.

### Moment scoring (0–100)

`base(eventType)` + `stageWeight(final 28 … group 0)` + `timing bonus
(80'+, 90'+)` + `game-state bonus (equalizer +16, go-ahead +10)` +
`milestone/shootout bonuses`, all × `relevance (0.45 if unrelated to the
chosen team/player)`. Yellow cards and substitutions are filtered as noise;
finals champions/runners-up are synthesized as result-level moments.

### Video timeline

Intro → team/player card → key match cards → biggest-moment cards
(importance bar) → statistics grid → AI verdict → outro. Slides are
crossfaded (0.6s xfade), muxed with a procedurally synthesized ambient bed;
when `OPENAI_API_KEY` is set, a TTS narration of the summary+verdict is
mixed in. Render falls back to plain concat if the xfade chain fails.

---

## Setup

**Prereqs:** Node 20+, Docker (for local Postgres) — or any `DATABASE_URL`.

```bash
npm install
docker compose up -d          # local Postgres on :5433
cp .env.example .env          # fill in what you have — all keys optional
npm run db:migrate            # prisma migrate dev
npm run db:seed               # tournaments, teams, players, matches, stats
npm run dev                   # http://localhost:3000
```

Optional, in a second terminal (production-like job processing —
jobs also run inline in dev without it):

```bash
npm run worker
```

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `AUTH_SECRET` | ✓ | JWT session signing (≥16 chars) |
| `OPENAI_API_KEY` | – | AI stories, Whisper STT, TTS narration (fallbacks without it) |
| `OPENAI_MODEL` | – | default `gpt-4o-mini` |
| `SPORTS_API_KEY` | – | API-Football live data (seeded data without it) |
| `SPORTS_API_BASE_URL` | – | provider base URL |
| `NEXT_PUBLIC_APP_URL` | – | canonical URL for SEO |
| `MEDIA_STORAGE` | – | `local` (public/generated) or `s3` |
| `S3_*` | – | object storage for production media |
| `RATE_LIMIT_RECAPS_PER_HOUR` | – | per-user generation cap (default 5) |

`.env` is git-ignored; `.env.example` is committed. **No secrets in code.**

---

## Testing

```bash
npm run test          # Vitest — stats, moments, AI schema/fallback, rate limit
npm run test:e2e      # Playwright — landing, demo, login→create→generate
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # production build
```

The test suite covers the moment engine's scoring rules (late winners >
early goals, knockout > group, equalizer detection via scoreline replay,
shootout moments, champions/runners-up), statistics aggregation, strict
AI-output validation, the LLM-free fallback writer, and the sliding-window
rate limiter.

---

## Deployment

**App (UI + API):** Vercel. Set env vars, `npm run build` works out of the box.
**Database:** Neon / Supabase Postgres — set `DATABASE_URL`, run
`npx prisma migrate deploy && npx tsx prisma/seed.ts`.
**Worker:** FFmpeg jobs are long-running — deploy `npm run worker` as a
separate service (Railway/Fly.io/VPS/Docker), not as a serverless function.
Set `WORKER_INLINE=false` on the app so jobs are only processed by workers.
**Media:** `MEDIA_STORAGE=s3` + S3/R2 bucket; generated videos move off the
app filesystem. Local mode is fine for single-instance deploys.

A `Dockerfile.worker` can wrap `npm run worker` — the same image as the app
with a different start command.

---

## Media rights

This project deliberately ships **zero copyrighted footage or broadcast
audio**. All video frames are generated programmatically; all data is either
factual/statistical (not copyrightable) or clearly-labeled simulated demo
content (`isDemo` flag shown in UI). The 2026 tournament is an explicit
simulation. The transcription endpoint accepts **user-provided** audio only.
Before going live with real highlights, you'd license footage from a rights
holder — the pipeline accepts licensed clips as an extension point.

---

## Security notes

- bcrypt (10 rounds) password hashing; JWT in httpOnly SameSite=Lax cookie
- Every protected query is owner-scoped at the repository layer
- Sliding-window rate limits: login, signup, generation, transcription
- Zod validation on every request body and every env var at boot
- Security headers (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
- User-facing messages never contain stack traces, SQL, or secrets

## Scaling notes

1,000 concurrent generations: stateless web tier × N; workers scale
independently (atomic status-claim makes `claimNext` concurrency-safe).
Upgrade path: GenerationJob table → Redis/BullMQ (same claim contract),
media → S3+CDN, provider reads → Redis cache, AI calls → queued with
provider backoff.

## Future improvements

- Real-time progress via SSE/WebSocket instead of polling
- Redis-backed rate limiter + cache for multi-instance deploys
- Licensed clip ingestion + beat-synced editing
- Multi-language narration (Whisper translate + localized TTS)
- Social sharing cards (OG image per recap via the same frame renderer)
- S3 storage driver implementation behind the existing `MEDIA_STORAGE` flag
