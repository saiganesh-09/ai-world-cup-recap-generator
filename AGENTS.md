<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: AI World Cup Recap Generator

Next.js 16 + TS + Tailwind v4 + Prisma 6/PostgreSQL. Full-stack AI recap product — see docs/ARCHITECTURE.md.

## Commands

- Dev DB: `npm run db:start` (embedded postgres :5433, UTF8 cluster; or `docker compose up -d db`)
- Schema/seed: `npx prisma db push && npm run db:seed`
- Dev: `npm run dev` · Build: `npm run build` · Lint: `npm run lint` · Types: `npm run typecheck`
- Tests: `npm test` (vitest; integration auto-skips without DB) · E2E: `npm run e2e`
- Job worker (optional standalone): `npm run worker`
- Demo login: `demo@worldcup.app` / `demo1234`

## Conventions

- Route handlers are thin — logic in `services/*`, DB in `repositories/*`, Prisma via `lib/db.ts`
- Async params/searchParams/cookies (Next 16); `middleware` → use `proxy.ts` convention
- All API bodies zod-validated; errors via `apiHandler`/`AppError` subclasses
- Expensive ops are GenerationJobs — never block HTTP on video/AI work
- Native-dep packages (sharp, ffmpeg-static, bcryptjs, @prisma/client) must stay in `serverExternalPackages`
- Secrets only via env (`lib/env.ts`); never `NEXT_PUBLIC_` anything private
