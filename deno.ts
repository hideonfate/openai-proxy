import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const OPENAI_API_HOST = "us.ifopen.ai";
const PORT = 8000;

// 1. 启动时一次性读取 Readme.md，并构造好基础 Response
const readmeMd = await Deno.readFile(new URL("./Readme.md", import.meta.url));
const readmeResponseTemplate = new Response(readmeMd, {
  status: 200,
  headers: { "content-type": "text/markdown; charset=utf-8" },
});

console.log(`Proxy server listening on 0.0.0.0:${PORT} → upstream host: ${OPENAI_API_HOST}`);

serve(handler, {
  hostname: "0.0.0.0",
  port: PORT,
});

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 根路径直接返回 Readme.md（clone 避免流读完后下次不可用）
  if (url.pathname === "/") {
    return readmeResponseTemplate.clone();
  }

  // 2. 修改目标 Host，保留协议、端口、路径、query
  url.host = OPENAI_API_HOST;

  // 3. 透传 headers，但要 overwrite Host
  const upstreamHeaders = new Headers(req.headers);
  upstreamHeaders.set("host", OPENAI_API_HOST);
  // （可选）显式设置 keep-alive，鼓励长连接复用
  upstreamHeaders.set("connection", "keep-alive");

  // 发起到上游的请求，方法、headers、body 都原样透传（保持流式）
  const upstreamResponse = await fetch(url.toString(), {
    method: req.method,
    headers: upstreamHeaders,
    // GET/HEAD 通常没有 body；其他方法如果有，则会自动透传流
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
  });

  // 4. 将上游响应的流和 headers/status 原样返回
  //    如果上游挂了（502），fetch 会reject，外层serve会捕获并自动返回502。
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: upstreamResponse.headers,
  });
}
