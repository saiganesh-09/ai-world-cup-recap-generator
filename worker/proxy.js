/**
 * Branded-URL proxy for the demo deployment.
 *
 * The demo app is served locally and exposed through a Cloudflare quick
 * tunnel whose hostname rotates on every restart. This Worker fronts it
 * with a stable workers.dev URL: the current tunnel origin lives in the
 * LIVE_URL KV namespace (key "current"), written by
 * scripts/serve-public.ts on every boot and tunnel restart.
 */
const WORKER_HOST_RE = /^https:\/\/[^/]+/;

const proxy = {
  async fetch(request, env) {
    const upstream = (await env.LIVE_URL.get("current"))?.replace(/\/$/, "");
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

export default proxy;
