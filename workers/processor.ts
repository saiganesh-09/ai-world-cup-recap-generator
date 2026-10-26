/**
 * Standalone job worker — `npm run worker`
 *
 * Polls the GenerationJob table (DB-backed queue), claims pending
 * jobs and runs the recap pipeline. Run alongside `npm run dev` or
 * as a separate service in production (Railway/Fly/VPS).
 *
 * For local dev without a worker, jobs also run inline — see
 * services/generation-runner.ts.
 */
import { jobRepo } from "../repositories/recap.repository";
import { prisma } from "../lib/prisma";
import { processJob } from "./runner";

const POLL_MS = 2000;
const CONCURRENCY = 2;

let running = 0;
let stop = false;

async function tick() {
  if (running >= CONCURRENCY) return;
  const job = await jobRepo.claimNext();
  if (!job) return;
  running++;
  processJob(job.recapId, job.id)
    .catch((e) => console.error(`[worker] job ${job.id} failed:`, e))
    .finally(() => running--);
}

async function main() {
  console.log(`[worker] started — polling every ${POLL_MS}ms, concurrency ${CONCURRENCY}`);
  const recovered = await jobRepo.recoverStale();
  if (recovered.count) console.log(`[worker] recovered ${recovered.count} stale job(s)`);

  while (!stop) {
    try {
      await tick();
    } catch (e) {
      console.error("[worker] poll error:", e);
      await new Promise((r) => setTimeout(r, 5000)); // DB hiccup backoff
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

process.on("SIGINT", () => (stop = true));
process.on("SIGTERM", () => (stop = true));

main().finally(() => prisma.$disconnect());
