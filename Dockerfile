# ── AI World Cup Recap Generator — production image ──────────────────
# Runs the full stack: Next.js app + in-process generation worker +
# FFmpeg media pipeline + Prisma client. Deploy on any container host
# (Railway, Render, Fly.io, ECS) — NOT Vercel serverless.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# ffmpeg-static downloads its binary here; prisma engines install too
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --no-audit --no-fund

# ── Build ────────────────────────────────────────────────────────────
FROM node:24-slim AS builder
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ── Runtime ──────────────────────────────────────────────────────────
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# Prisma query engine needs openssl at runtime on slim images
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./
# tsx entrypoints used by the entrypoint (seed) and optional worker
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/services ./services
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/repositories ./repositories
COPY --from=builder /app/types ./types
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Media output dirs (mount a volume at /app/public/generated to persist videos)
RUN chmod +x docker-entrypoint.sh && mkdir -p public/generated tmp-media

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
