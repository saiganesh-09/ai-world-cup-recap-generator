/**
 * One-command public demo startup — self-healing.
 *
 * - Starts the embedded dev DB (skipped if already listening)
 * - Opens a Cloudflare quick tunnel and writes the URL to .env,
 *   LIVE_URL.txt (worker proxy source), README, and the GitHub
 *   repo homepage field — then commits & pushes
 * - Boots the production build (skipped if already listening)
 * - Watches the tunnel and restarts + re-publishes if it dies
 *   (laptop sleep, network drops)
 *
 * Installed at Windows logon via start-public.bat in the Startup folder.
 *
 * Usage:  npm run public        (run `npm run build` first)
 * Keep this running; Ctrl+C stops everything.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
const readmePath = path.join(process.cwd(), "README.md");
const liveUrlPath = path.join(process.cwd(), "LIVE_URL.txt");
const stableUrlPath = path.join(process.cwd(), "STABLE_URL.txt");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const CLOUDFLARED = path.resolve("cloudflared.exe");
const REPO = "saiganesh-09/ai-world-cup-recap-generator";
const KV_NAMESPACE_ID = "6a8abedaa28648aeaf07022e56709724";
const TUNNEL_HOST_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const HEALTH_PATH = "/api/live";
const WATCHDOG_MS = 45_000;

const children = new Set<ChildProcess>();
let tunnelUrl: string | null = null;
let restarting = false;

function run(cmd: string, args: string[], quiet = false, shell = false) {
  const child = spawn(cmd, args, { shell, windowsHide: true });
  if (!quiet) {
    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));
  }
  children.add(child);
  child.on("exit", () => children.delete(child));
  return child;
}

function sh(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { shell: false, encoding: "utf8" });
  if (r.status !== 0) {
    console.log(`[public] warn: ${cmd} ${args.join(" ")} failed (${r.status})`);
  }
  return r.status === 0;
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createConnection({ host: "127.0.0.1", port });
    s.setTimeout(2000);
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => resolve(false));
    s.once("timeout", () => {
      s.destroy();
      resolve(false);
    });
  });
}

/** Branded front-door URL (workers.dev) if configured, else the tunnel. */
function publicUrl(t: string) {
  try {
    const stable = readFileSync(stableUrlPath, "utf8").trim();
    if (stable.startsWith("https://")) return stable.replace(/\/$/, "");
  } catch {
    /* no stable URL yet */
  }
  return t;
}

function setEnvUrl(url: string) {
  const env = readFileSync(envPath, "utf8");
  const next = env.match(/^NEXT_PUBLIC_APP_URL=.*$/m)
    ? env.replace(/^NEXT_PUBLIC_APP_URL=.*$/m, `NEXT_PUBLIC_APP_URL="${url}"`)
    : env + `\nNEXT_PUBLIC_APP_URL="${url}"\n`;
  writeFileSync(envPath, next);
}

/** Write the tunnel origin into Workers KV — the branded proxy reads it. */
function syncKv(tUrl: string) {
  const r = spawnSync(
    "npx",
    ["wrangler", "kv", "key", "put", "current", tUrl, "--remote", "--namespace-id", KV_NAMESPACE_ID],
    { shell: true, encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.log("[public] warn: KV sync failed", r.stderr?.slice(-200) ?? "");
  }
}

/** Publish the fresh URL to .env, Workers KV, LIVE_URL.txt, README,
 *  and the GitHub repo homepage field. */
function syncPublicUrl(tUrl: string) {
  const url = publicUrl(tUrl);
  setEnvUrl(url);
  writeFileSync(liveUrlPath, tUrl + "\n");
  syncKv(tUrl);

  const readme = readFileSync(readmePath, "utf8");
  const updated = readme.replace(TUNNEL_HOST_RE, url);
  if (updated !== readme) writeFileSync(readmePath, updated);

  sh("git", ["add", "README.md", "LIVE_URL.txt"]);
  sh("git", [
    "-c",
    "user.email=devin-ai-integration[bot]@users.noreply.github.com",
    "-c",
    "user.name=public-url-bot",
    "commit",
    "-q",
    "-m",
    "chore: refresh live demo tunnel URL",
  ]);
  sh("git", ["push", "-q"]);
  sh("gh", ["repo", "edit", REPO, "--homepage", url]);
  console.log("[public] URLs synced →", url);
}

function waitForTunnelUrl(tunnel: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("tunnel URL timeout")),
      60_000,
    );
    tunnel.stderr?.on("data", (chunk: Buffer) => {
      const m = chunk.toString().match(TUNNEL_HOST_RE);
      if (m) {
        clearTimeout(timer);
        resolve(m[0]);
      }
    });
    tunnel.on("exit", (code) =>
      reject(new Error(`cloudflared exited with code ${code}`)),
    );
  });
}

async function openTunnel(): Promise<ChildProcess> {
  const tunnel = run(CLOUDFLARED, [
    "tunnel",
    "--url",
    "http://localhost:3000",
    "--no-autoupdate",
  ]);
  const url = await waitForTunnelUrl(tunnel);
  tunnelUrl = url;
  syncPublicUrl(url);
  console.log(`[public] tunnel live → ${publicUrl(url)}`);
  return tunnel;
}

/** Restart the tunnel when it dies (sleep, network drop, CF eviction). */
async function watchTunnel() {
  if (!tunnelUrl || restarting) return;
  let alive = false;
  try {
    const r = await fetch(tunnelUrl + HEALTH_PATH, {
      signal: AbortSignal.timeout(10_000),
    });
    alive = r.ok;
  } catch {
    alive = false;
  }
  if (alive) return;

  restarting = true;
  console.log("[public] tunnel unreachable — restarting...");
  try {
    const old = [...children].find((c) => c.spawnfile === CLOUDFLARED);
    old?.kill("SIGTERM");
    await openTunnel();
  } catch (e) {
    console.log("[public] tunnel restart failed:", e);
  } finally {
    restarting = false;
  }
}

async function main() {
  if (await portOpen(5433)) {
    console.log("[public] Postgres already running on :5433");
  } else {
    console.log("[public] starting embedded Postgres...");
    run(NPM, ["run", "db:start"], true, true);
    await new Promise((r) => setTimeout(r, 8000));
  }

  await openTunnel();

  if (await portOpen(3000)) {
    console.log("[public] app already running on :3000");
  } else {
    console.log("[public] starting production server on :3000...");
    run(NPM, ["start"], false, true);
  }

  console.log("[public] Ctrl+C stops DB + app + tunnel.\n");
  setInterval(watchTunnel, WATCHDOG_MS);

  const shutdown = () => {
    console.log("\n[public] shutting down...");
    for (const c of children) c.kill("SIGTERM");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
