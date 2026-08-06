// niwi.cc 路由 Worker：把 /sd/ 子路径代理到 Cloudflare Pages 应用
// 部署方式：Cloudflare 控制台 → Workers & Pages → Create Worker → 粘贴本文件内容
// 然后 Workers 路由：niwi.cc/* （Zone niwi.cc，已接入 Cloudflare 时可直接绑定域名）
const ORIGIN = 'https://sd-prompt-generator.pages.dev';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/sd' || path.startsWith('/sd/')) {
      const rest = path.slice(3); // 去掉 /sd
      const target = ORIGIN + (rest.startsWith('/') ? rest : '/' + rest) + url.search;
      const method = request.method;
      const body = method === 'GET' || method === 'HEAD' ? undefined : request.body;
      const resp = await fetch(target, {
        method: method,
        headers: request.headers,
        body: body,
        redirect: 'manual'
      });
      return resp;
    }

    // 主站占位：以后 niwi.cc 根路径的内容在这里处理
    return new Response(
      '<!DOCTYPE html><html lang="zh-CN"><meta charset="utf-8"><title>niwi.cc</title>' +
      '<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">' +
      '<div style="text-align:center;"><h1>niwi.cc</h1><p><a href="/sd/">SD Prompt Generator</a></p></div></body></html>',
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
};
