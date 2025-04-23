// proxy.ts
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const UPSTREAM_HOST = "us.ifopen.ai";
const PORT = 8000;

// ——————————————————— 读取 README ———————————————————
const readmeMd = await Deno.readFile(new URL("./Readme.md", import.meta.url));
const readmeTemplate = new Response(readmeMd, {
  status: 200,
  headers: {
    "content-type": "text/markdown; charset=utf-8",
    // 把 timeout 改为 0 => 无限制
    "connection": "keep-alive",
    "keep-alive": "timeout=1200,max=0",
  },
});

console.log(
  `🚀 Proxy listening on http://0.0.0.0:${PORT} → upstream ${UPSTREAM_HOST}`,
);

// ——————————————————— 启动 HTTP 服务 ———————————————————
serve(handler, { hostname: "0.0.0.0", port: PORT });

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 根路径 => README
  if (url.pathname === "/") return readmeTemplate.clone();

  // 其它路径全部转到上游
  url.host = UPSTREAM_HOST;

  // ---------- 1.   组装要发给上游的 Header ----------
  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set("host", UPSTREAM_HOST);

  // 关键：告诉上游“永远 keep-alive”
  forwardHeaders.set("connection", "keep-alive");
  forwardHeaders.set("keep-alive", "timeout=1200,max=0"); // ← 修改点

  // ---------- 2.   发请求 ----------
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    });
  } catch (err) {
    console.error("⚠️ fetch upstream failed:", err);
    return new Response("Bad Gateway", { status: 502 });
  }

  // ---------- 3.   把上游响应头覆写并回客户端 ----------
  const respHeaders = new Headers(upstreamRes.headers);

  // 关键：同样告诉客户端“我也一直保持长连接”
  respHeaders.set("connection", "keep-alive");
  respHeaders.set("keep-alive", "timeout=1200,max=0");   // ← 修改点

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: respHeaders,
  });
}
