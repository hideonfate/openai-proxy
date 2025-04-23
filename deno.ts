import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

const OPENAI_API_HOST = "openrouter.ai";
const readmeMd = await Deno.readFile(new URL("./Readme.md", import.meta.url));

serve(
  async (req) => {
    const url = new URL(req.url);

    // 根路径返回 Readme
    if (url.pathname === "/") {
      return new Response(readmeMd, {
        status: 200,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }

    // 1) 只改 host，保留 protocol/port
    url.host = OPENAI_API_HOST;

    // 2) 直接把客户端的 Request 当 init 传给 fetch
    //    这样 method、headers、body 全部原封不动地被带过去，
    //    包括你客户端输入的 Authorization 或 x-api-key。
    return fetch(url, req);
  },
  {
    port: 8000,
    hostname: "0.0.0.0",
    useFastHttp: true,
  },
);
