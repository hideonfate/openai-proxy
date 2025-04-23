const OPENAI_API_HOST = "us.ifopen.ai";

Deno.serve(async (req) => {
  // 1. 构造上游 URL
  const url = new URL(req.url);
  url.hostname = OPENAI_API_HOST;
  // 注意：必须把 host 头也改成 OPENAI_API_HOST
  const headers = new Headers(req.headers);
  headers.set("host", OPENAI_API_HOST);

  // 2. 发起 fetch，不做任何超时、buffer 操作
  const upstreamResp = await fetch(url.toString(), {
    method: req.method,
    headers,
    body: req.body,
    redirect: "follow",
  });

  // 3. 原封不动用流的方式把上游 body 透传给客户端
  //    同时删除 content-length，让底层自动用 chunked‐transfer‐encoding
  const respHeaders = new Headers(upstreamResp.headers);
  respHeaders.delete("content-length");

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: respHeaders,
  });
});
