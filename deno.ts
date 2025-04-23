import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const OPENAI_API_HOST = "openrouter.ai";
const readmeMd = await Deno.readFile(new URL("./Readme.md", import.meta.url));

serve(
  async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return new Response(readmeMd, {
        status: 200,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }

    // 1) 修改 host ；2) 强制保留 keep‑alive
    url.host = OPENAI_API_HOST;
    const proxyReq = new Request(url.toString(), {
      method: req.method,
      headers: {
        ...req.headers,
        Connection: "keep-alive",
      },
      body: req.body,  // 流式转发
    });

    // 3) 直接把 fetch 返回的流拿过来，不额外 buffer
    const resp = await fetch(proxyReq);
    // 4) 同样流式转发回客户端
    return new Response(resp.body, {
      status: resp.status,
      headers: resp.headers,
    });
  },
  {
    port: 8000,
    hostname: "0.0.0.0",
    useFastHttp: true,
  },
);
