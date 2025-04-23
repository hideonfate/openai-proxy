import { serve } from "https://deno.land/std/http/server.ts";

const OPENAI_HOST = "us.ifopen.ai";

serve(async (req) => {
// 构造完整目标 URL（含路径、查询串）
const u = new URL(req.url);
const target = https://${OPENAI_HOST}${u.pathname}${u.search};

// 把原始请求克隆到目标地址
const proxyReq = new Request(target, {
method: req.method,
headers: (() => {
const h = new Headers(req.headers);
h.delete("host");
h.delete("content-length");
return h;
})(),
body: req.body,     // Deno 里直接传即可
});

// 向上游发送
const resp = await fetch(proxyReq);

// 想改什么头，在这里处理
resp.headers.set("Referrer-Policy", "no-referrer");

// 直接把 Response 往回丢，流就能完整透传
return resp;
});
