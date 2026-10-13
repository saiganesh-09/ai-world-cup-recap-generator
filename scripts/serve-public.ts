/**
 * One-command public demo startup.
 *
 * Starts the embedded dev DB, opens a Cloudflare quick tunnel, writes
 * the public URL into .env, then boots the production build — so
 * share/OG links point at the live tunnel from the first request.
 *
 * Usage:  npm run public        (run `npm run build` first)
 * Keep this running; Ctrl+C stops everything.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const children: ChildProcess[] = [];
const envPath = path.join(process.cwd(), ".env");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const CLOUDFLARED = path.resolve("cloudflared.exe");

function run(cmd: string, args: string[], quiet = false) {
  const child = spawn(cmd, args, { shell: false, windowsHide: true });
  if (!quiet) {
    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));
  }
  children.push(child);
  return child;
}

function setEnvUrl(url: string) {
  const env = readFileSync(envPath, "utf8");
  const next = env.match(/^NEXT_PUBLIC_APP_URL=.*$/m)
    ? env.replace(/^NEXT_PUBLIC_APP_URL=.*$/m, `NEXT_PUBLIC_APP_URL="${url}"`)
    : env + `\nNEXT_PUBLIC_APP_URL="${url}"\n`;
  writeFileSync(envPath, next);
}

function waitForTunnelUrl(tunnel: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("tunnel URL timeout")), 30_000);
    tunnel.stderr?.on("data", (chunk: Buffer) => {
      const m = chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
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
  run(NPM, ["run", "db:start"], true);
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

  console.log(`\n[public] LIVE → ${url}\n`);
  console.log("[public] starting production server on :3000...");
  run(NPM, ["start"]);
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
