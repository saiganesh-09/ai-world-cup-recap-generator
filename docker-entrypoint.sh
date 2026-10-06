#!/usr/bin/env sh
set -e

echo "[entrypoint] Syncing database schema..."
npx prisma db push --skip-generate

echo "[entrypoint] Checking seed state..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then((c) => { console.log(c); })
  .finally(() => p.\$disconnect());
")

if [ "$USER_COUNT" = "0" ]; then
  echo "[entrypoint] Empty database — seeding demo dataset + showcase recap..."
  npx tsx prisma/seed.ts || echo "[entrypoint] Seed failed — app will still boot"
else
  echo "[entrypoint] Database already seeded ($USER_COUNT users)"
fi

echo "[entrypoint] Starting Next.js on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}"
