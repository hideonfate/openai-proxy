// proxy.ts
// deno run -A proxy.ts

const OPENAI_API_HOST = "us.ifopen.ai";

Deno.serve((clientReq) => {
  // 1. 保留路径和查询串，只把 host + protocol 换掉
  const upstreamUrl = new URL(clientReq.url);
  upstreamUrl.protocol = "https:";    // 确保走 HTTPS
  upstreamUrl.host     = OPENAI_API_HOST;

  // 2. 直接把原始请求参数透传给上游
  //    duplex: "half" 让可读流 body 能够被正常转发
  return fetch(upstreamUrl, {
    method:   clientReq.method,
    headers:  clientReq.headers,
    body:     clientReq.body,
    redirect: "follow",
    // @ts-ignore TS 暂未收录 duplex
    duplex:   "half",
  });
});
