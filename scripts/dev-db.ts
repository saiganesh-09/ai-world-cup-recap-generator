/**
 * Starts an embedded PostgreSQL server for local development.
 * Real PostgreSQL binaries (no Docker required) — data lives in .dev-db/
 *
 * Usage:  npm run db:start     (keep running; Ctrl+C to stop)
 *
 * Equivalent alternative:  docker compose up -d db
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const PORT = 5433;
const DATA_DIR = path.join(process.cwd(), ".dev-db");
const DB_NAME = "worldcup";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
    // UTF8 cluster so emoji flags/text store correctly on Windows locales
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: (msg: string) => process.stdout.write(`[pg] ${msg}`),
    onError: (msg: unknown) =>
      process.stderr.write(`[pg:error] ${String(msg)}\n`),
  });

  console.log(`Starting embedded PostgreSQL on 127.0.0.1:${PORT} ...`);
  const initialized = existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (initialized) {
    // Clear a stale pid file from an unclean shutdown so pg_ctl can start.
    const pidFile = path.join(DATA_DIR, "postmaster.pid");
    if (existsSync(pidFile)) rmSync(pidFile);
  } else {
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`Database "${DB_NAME}" ready.`);
  } catch (e) {
    if (String(e).includes("already exists")) {
      console.log(`Database "${DB_NAME}" already exists.`);
    } else {
      throw e;
    }
  }

  console.log(
    `\nDATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB_NAME}"`,
  );
  console.log("Press Ctrl+C to stop.\n");

  const shutdown = async () => {
    console.log("\nStopping PostgreSQL...");
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep process alive
  setInterval(() => {}, 60_000);
}

main().catch((err) => {
  // If the port is taken, embedded postgres fails on start — surface a hint.
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`).toString();
    if (out.trim()) {
      console.error(
        `Port ${PORT} already in use — the dev database may already be running.\n${out}`,
      );
    }
  } catch {
    /* ignore */
  }
  console.error(err);
  process.exit(1);
});
