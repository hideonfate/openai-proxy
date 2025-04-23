import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const OPENAI_API_HOST = "us.ifopen.ai";
const readmeMd = await Deno.readFile(
  new URL("./Readme.md", import.meta.url),
);

serve(
  async (req) => {
    const url = new URL(req.url);

    // 根路径直接返回 Readme.md
    if (url.pathname === "/") {
      return new Response(readmeMd, {
        status: 200,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }

    // 只改 host，保留 protocol/port
    url.host = OPENAI_API_HOST;

    // 发起到上游的请求，方法、headers、body 都原样透传
    const upstreamResponse = await fetch(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    // 将上游返回的 body 以流的形式返给客户端
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    });
  },
  {
    hostname: "0.0.0.0",
    port: 8000,
  },
);
