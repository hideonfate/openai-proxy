// deno run -A server.ts
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const {
  // 自行 export OPENAI_API_KEY=<your-key>；不设置也可以通过 header 传
  OPENAI_API_KEY,
  // export PORT=8080
  PORT = "8000",
  // export OPENAI_UPSTREAM=https://api.openai.com
  OPENAI_UPSTREAM = "https://us.ifopen.ai",
} = Deno.env.toObject();

/** 允许的 CORS 域，可按需配置 */
const CORS_ORIGIN = "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

serve(
  async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    /* ---------- 1. 静态文件 ---------- */
    if (url.pathname === "/") {
      return fetch(import.meta.resolve("./README.md"));
    }

    /* ---------- 2. 预检请求 ---------- */
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    /* ---------- 3. 组装上游 URL ---------- */
    const upstreamURL = new URL(req.url);
    const upstreamBase = new URL(OPENAI_UPSTREAM);
    upstreamURL.protocol = upstreamBase.protocol;
    upstreamURL.hostname = upstreamBase.hostname;
    upstreamURL.port = upstreamBase.port; // 443 / 80 等

    /* ---------- 4. 透传 Headers，并按需注入鉴权 ---------- */
    const headers = new Headers(req.headers);
    if (!headers.has("Authorization") && OPENAI_API_KEY) {
      headers.set("Authorization", `Bearer ${OPENAI_API_KEY}`);
    }

    /* ---------- 5. 发起上游请求 ---------- */
    let upstreamResp: Response;
    try {
      upstreamResp = await fetch(upstreamURL, {
        method: req.method,
        headers,
        body: req.body,
        // HTTP streaming 需要 duplex，Deno v1.28+ 支持
        duplex: "half",
      });
    } catch (err) {
      console.error("Upstream fetch error:", err);
      return new Response("Bad Gateway", { status: 502 });
    }

    /* ---------- 6. 把上游响应返回，并加 CORS ---------- */
    const respHeaders = new Headers(upstreamResp.headers);
    respHeaders.set("Access-Control-Allow-Origin", CORS_ORIGIN);

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: respHeaders,
    });
  },
  {
    port: Number(PORT),
    onListen({ hostname, port }) {
      console.log(`Proxy listening on http://${hostname}:${port}`);
    },
  },
);
