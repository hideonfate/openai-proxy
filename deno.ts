// proxy.ts
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

// 上游 API host
const UPSTREAM_HOST = "us.ifopen.ai";
// 本地监听端口
const PORT = 8000;

// 直接一次性读入 Readme.md，根目录时返回
const readmeMd = await Deno.readFile(new URL("./Readme.md", import.meta.url));
const readmeTemplate = new Response(readmeMd, {
  status: 200,
  headers: {
    "content-type": "text/markdown; charset=utf-8",
    // 保持根目录响应也为 keep-alive
    "connection": "keep-alive",
    "keep-alive": "timeout=1200,max=0",
  },
});

console.log(`🚀 Proxy listening on http://0.0.0.0:${PORT} → upstream ${UPSTREAM_HOST}`);

// 启动 HTTP 服务
serve(handler, { hostname: "0.0.0.0", port: PORT });

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 根路径直接返回 README
  if (url.pathname === "/") {
    return readmeTemplate.clone();
  }

  // 转发所有非根路径请求到 UPSTREAM_HOST
  url.host = UPSTREAM_HOST;

  // 原样透传 headers，并强制替换 Host + keep-alive
  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set("host", UPSTREAM_HOST);
  forwardHeaders.set("connection", "keep-alive");
  // 告诉上游「请维持至少 1200 的长连接」
  forwardHeaders.set("keep-alive", "timeout=1200,max=0");

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(url.toString(), {
      method: req.method,
      headers: forwardHeaders,
      // GET/HEAD 没 body，其他请求直接透传流
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    });
  } catch (err) {
    console.error("⚠️ fetch upstream failed:", err);
    return new Response("Bad Gateway", { status: 502 });
  }

  // 取出上游返回的流和 headers，做必要的 keep-alive 覆盖
  const respHeaders = new Headers(upstreamRes.headers);
  respHeaders.set("connection", "keep-alive");
  respHeaders.set("keep-alive", "timeout=1200,max=0");

  // 直接返回上游的 ReadableStream，流式转发
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: respHeaders,
  });
}
