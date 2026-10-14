/**
 * One-command public demo startup — self-healing.
 *
 * Starts the embedded dev DB, opens a Cloudflare quick tunnel, writes
 * the public URL into .env, syncs the URL to the GitHub repo homepage
 * field + README, then boots the production build.
 *
 * Designed to run on Windows logon via Task Scheduler: every restart
 * mints a fresh tunnel URL and re-publishes it automatically.
 *
 * Usage:  npm run public        (run `npm run build` first)
 * Keep this running; Ctrl+C stops everything.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const children: ChildProcess[] = [];
const envPath = path.join(process.cwd(), ".env");
const readmePath = path.join(process.cwd(), "README.md");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const CLOUDFLARED = path.resolve("cloudflared.exe");
const REPO = "saiganesh-09/ai-world-cup-recap-generator";
const TUNNEL_HOST_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

function run(cmd: string, args: string[], quiet = false, shell = false) {
  const child = spawn(cmd, args, { shell, windowsHide: true });
  if (!quiet) {
    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));
  }
  children.push(child);
  return child;
}

function sh(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { shell: false, encoding: "utf8" });
  if (r.status !== 0) {
    console.log(`[public] warn: ${cmd} ${args.join(" ")} failed (${r.status})`);
  }
  return r.status === 0;
}

function setEnvUrl(url: string) {
  const env = readFileSync(envPath, "utf8");
  const next = env.match(/^NEXT_PUBLIC_APP_URL=.*$/m)
    ? env.replace(/^NEXT_PUBLIC_APP_URL=.*$/m, `NEXT_PUBLIC_APP_URL="${url}"`)
    : env + `\nNEXT_PUBLIC_APP_URL="${url}"\n`;
  writeFileSync(envPath, next);
}

/** Point README + GitHub repo homepage at the fresh tunnel URL. */
function syncPublicUrl(url: string) {
  // README: replace any previous tunnel URL
  const readme = readFileSync(readmePath, "utf8");
  const updated = readme.replace(TUNNEL_HOST_RE, url);
  if (updated !== readme) {
    writeFileSync(readmePath, updated);
    sh("git", ["add", "README.md"]);
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
    console.log("[public] README + GitHub updated to", url);
  }
  sh("gh", ["repo", "edit", REPO, "--homepage", url]);
}

function waitForTunnelUrl(tunnel: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("tunnel URL timeout")), 30_000);
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

async function main() {
  console.log("[public] starting embedded Postgres...");
  run(NPM, ["run", "db:start"], true, true);
  await new Promise((r) => setTimeout(r, 8000));

  console.log("[public] opening Cloudflare tunnel...");
  const tunnel = run(CLOUDFLARED, [
    "tunnel",
    "--url",
    "http://localhost:3000",
    "--no-autoupdate",
  ]);
  const url = await waitForTunnelUrl(tunnel);
  setEnvUrl(url);
  syncPublicUrl(url);

  console.log(`\n[public] LIVE → ${url}\n`);
  console.log("[public] starting production server on :3000...");
  run(NPM, ["start"], false, true);
  console.log("[public] Ctrl+C stops DB + app + tunnel.\n");

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
