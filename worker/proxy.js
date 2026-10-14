/**
 * Branded-URL proxy for the demo deployment.
 *
 * The demo app is served locally and exposed through a Cloudflare quick
 * tunnel whose hostname rotates on every restart. This Worker fronts it
 * with a stable workers.dev URL: each request resolves the current
 * tunnel origin from LIVE_URL.txt in the GitHub repo (kept fresh by
 * scripts/serve-public.ts on every boot) and proxies through.
 */
const LIVE_URL_TXT =
  "https://raw.githubusercontent.com/saiganesh-09/ai-world-cup-recap-generator/main/LIVE_URL.txt";

const WORKER_HOST_RE = /^https:\/\/[^/]+/;

export default {
  async fetch(request) {
    const upstream = await currentUpstream();
    if (!upstream) {
      return new Response("Demo is starting — try again in a few seconds.", {
        status: 502,
        headers: { "content-type": "text/plain" },
      });
    }

    const url = new URL(request.url);
    const target = upstream + url.pathname + url.search;

    const proxyReq = new Request(target, request);
    proxyReq.headers.set("x-forwarded-host", url.host);

    const resp = await fetch(proxyReq);

    // Rewrite redirect targets so the browser stays on the branded host.
    const location = resp.headers.get("location");
    if (location && location.startsWith(upstream)) {
      const rewritten = location.replace(WORKER_HOST_RE, url.origin);
      const headers = new Headers(resp.headers);
      headers.set("location", rewritten);
      return new Response(resp.body, { status: resp.status, headers });
    }
    return resp;
  },
};

async function currentUpstream() {
  const resp = await fetch(LIVE_URL_TXT, {
    cf: { cacheTtl: 20, cacheEverything: true },
  });
  if (!resp.ok) return null;
  const text = (await resp.text()).trim();
  return text.startsWith("https://") ? text.replace(/\/$/, "") : null;
}
