/**
 * Standalone job worker: npm run worker
 *
 * Polls the GenerationJob table and processes queued recap/video jobs.
 * In a horizontally-scaled deployment this file is the entrypoint of a
 * dedicated worker container (swap pollOnce for BullMQ/SQS consumer
 * without touching the pipeline code).
 */
import { pollOnce } from "./job-processor";
import { prisma } from "../lib/db";

const POLL_MS = 2000;

async function main() {
  console.log("[worker] generation worker started — polling every 2s");
  for (;;) {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[worker] poll error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

const shutdown = async () => {
  console.log("\n[worker] shutting down");
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void main();
