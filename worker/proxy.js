/**
 * Branded-URL proxy for the demo deployment.
 *
 * The demo app is served locally and exposed through a Cloudflare quick
 * tunnel whose hostname rotates on every restart. This Worker fronts it
 * with a stable workers.dev URL: the current tunnel origin lives in the
 * LIVE_URL KV namespace (key "current"), written by
 * scripts/serve-public.ts on every boot and tunnel restart.
 *
 * Any upstream failure (dead tunnel, DNS, CF edge 5xx) is masked behind
 * a friendly auto-retry page — visitors never see raw error screens.
 */
const WORKER_HOST_RE = /^https:\/\/[^/]+/;

const WAKING_HTML = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="8">
<title>WC Recap — starting up</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0a0e1a;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif}
  .c{text-align:center;max-width:26rem;padding:2rem}
  .dot{width:.7rem;height:.7rem;border-radius:50%;background:#f59e0b;display:inline-block;
       margin-right:.6rem;animation:p 1s infinite alternate}
  @keyframes p{to{opacity:.25}}
  h1{font-size:1.25rem;font-weight:700;margin:.8rem 0 .4rem}
  p{color:#94a3b8;font-size:.9rem;line-height:1.5;margin:0}
  a{color:#f59e0b}
</style></head><body><div class="c">
  <div><span class="dot"></span><strong>Waking the demo…</strong></div>
  <h1>AI World Cup Recap Generator</h1>
  <p>The demo server is spinning up — this page refreshes automatically
     in a few seconds. If it persists, the host machine may be off.</p>
</div></body></html>`;

const proxy = {
  async fetch(request, env) {
    const upstream = (await env.LIVE_URL.get("current"))?.replace(/\/$/, "");
    if (!upstream) return waking();

    const url = new URL(request.url);
    const target = upstream + url.pathname + url.search;
    const proxyReq = new Request(target, request);
    proxyReq.headers.set("x-forwarded-host", url.host);

    let resp;
    try {
      resp = await fetch(proxyReq, { signal: AbortSignal.timeout(20_000) });
    } catch {
      return waking();
    }

    // Cloudflare tunnel edge errors (520–530) → friendly retry page.
    if (resp.status >= 520) return waking();

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

function waking() {
  return new Response(WAKING_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default proxy;
