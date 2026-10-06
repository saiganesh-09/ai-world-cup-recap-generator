# Architecture — AI World Cup Recap Generator

## Overview

A full-stack Next.js application that turns World Cup tournament data, match
events, and player performances into personalized, AI-generated recap stories
and automatically assembled highlight videos.

```
Browser
   │
   ▼
Next.js 16 (App Router)                     ┌───────────────────────────────┐
   ├─ Server Components (pages)             │  External services            │
   ├─ Route Handlers (/api/*)               │                               │
   │      │                                 │   ┌─────────────┐             │
   ▼      ▼                                 │   │ Sports API  │ (optional)  │
Service layer (services/*)                 │   └─────────────┘             │
   │        │            │                 │   ┌─────────────┐             │
   │        │            └──► AI engine ───┼──►│ OpenAI API  │ (optional)  │
   │        │                 (zod-validated,│ └─────────────┘             │
   │        │                  deterministic │   ┌─────────────┐             │
   │        │                  fallback)     │   │ FFmpeg      │             │
   │        ▼                                │   │ (ffmpeg-    │             │
   │   Repositories ─────► Prisma ──► PostgreSQL│ static)    │             │
   │                                       │   └─────────────┘             │
   └─► SportsDataProvider                   └───────────────────────────────┘
         ├─ DemoDataProvider (DB-backed seed data, default)
         └─ ApiFootballProvider (API-Football compatible, when SPORTS_API_KEY set)
```

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router | Server components for data-heavy pages, route handlers for the API, single deployable unit |
| Language | TypeScript strict | Type safety across the AI/media pipelines |
| Database | PostgreSQL + Prisma | Relational fit (tournaments→matches→events→stats), managed in prod (Neon/Supabase), `embedded-postgres` for zero-dependency local dev, `docker-compose.yml` alternative |
| Auth | Credentials + DB sessions | httpOnly cookie session, bcryptjs hashing, server-side authorization checks on every protected resource |
| AI | OpenAI `chat.completions` JSON mode + zod | Structured, validated output; deterministic rule-based generator as fallback so demo mode never breaks |
| Video | SVG storyboard → sharp PNG frames → ffmpeg xfade → mp4 | No copyrighted footage needed; fully generated visuals; `ffmpeg-static` bundles the binary |
| Audio | OpenAI TTS narration when key present, synthesized ambient bed otherwise | Graceful degradation |
| Jobs | DB-backed `GenerationJob` + in-process worker | Real progress states, horizontally scalable to a queue (documented) |
| Rate limiting | In-memory sliding window | Simple, dependency-free; Redis variant documented |
| Caching | TTL cache in provider + HTTP cache hints | Sports data is read-heavy and changes slowly |

## Layered structure

```
app/            routes, pages, API route handlers (thin)
components/     UI primitives + feature components
lib/            env, db, auth, errors, rate-limit, utils
services/       business logic (provider, recap, ai, moments, video, transcription)
repositories/   prisma access, one file per aggregate
types/          shared DTOs
hooks/          client hooks
workers/        job processor (imported by API + standalone runner)
prisma/         schema + seed
scripts/        dev-db bootstrap
tests/          unit / integration / e2e
public/generated  rendered videos + thumbnails (local object store)
```

## Generation pipeline

```
POST /api/recaps                 → create Recap (DRAFT)
POST /api/recaps/:id/generate    → create GenerationJob, kick worker, return job
GET  /api/recaps/:id/status      → real job stage + progress (polled by UI)
```

Stages (each updates `GenerationJob.progress`):

1. `collecting_data`      5%  — provider: tournament, team/player, matches
2. `analyzing`           20%  — aggregate stats, knockout progression
3. `finding_moments`     35%  — importance engine ranks events 0–100
4. `writing_story`       50%  — AI narrative (validated JSON) or fallback
5. `preparing_visuals`   70%  — SVG slide storyboard → PNG frames
6. `creating_video`      85%  — ffmpeg assembly + audio
7. `finalizing`          95%  — persist Recap + RecapMoments → COMPLETED

Failures mark the job FAILED with a user-safe error; details logged server-side.

## Security

- Secrets only in env vars (`OPENAI_API_KEY`, `SPORTS_API_KEY`, `DATABASE_URL`), validated by `lib/env.ts`, never sent to the client (`NEXT_PUBLIC_` only for the app URL).
- Authorization: every recap query is scoped to `session.userId`; ownership checked server-side before read/mutate.
- Input validation: zod schemas on every API body/param.
- Rate limits on `generate`, `transcription`, `video/generate`.
- bcryptjs password hashing, random session tokens stored hashed.

## Scalability notes

- The job worker is a single file (`workers/job-processor.ts`) invoked in-process
  for dev and runnable standalone (`npm run worker`) or behind BullMQ/SQS for
  horizontal scale — swap `enqueueJob` internals only.
- Video rendering is CPU-bound → dedicated worker containers; artifacts to S3.
- Provider cache + DB indexes (`match.date`, `player.name`, `recap.userId`) keep
  reads sub-linear; all list endpoints paginate.

## Media rights

No copyrighted broadcast footage is used anywhere. All video visuals are
generated (SVG→PNG). User-uploaded audio for transcription is the only
ingested media. Demo data is clearly labeled.

## Implementation roadmap

1. Foundation: scaffold, env, deps
2. DB: schema, embedded postgres, seed
3. Core lib + auth
4. Providers, repositories, services
5. Moment engine + stats
6. AI engine + fallback
7. Jobs + video + transcription pipelines
8. API routes
9. UI (landing → dashboard → wizard → detail → explore → engineering)
10. SEO/a11y/loading polish
11. Tests
12. Docs + deployment notes
13. Final audit
