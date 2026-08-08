# SD Prompt Generator 仓库

本仓库包含多个相互独立的项目：

- `sd/` — **SD Prompt Generator**（Stable Diffusion 提示词生成器：前端 + Vercel/Netlify/Cloudflare 函数 + 部署教程），详见 [sd/README.md](sd/README.md)
- `niwi/` — niwi.cc 个人主页（博客 / 项目 / 关于 + 后台管理）
- `workers/` — niwi.cc 路由 Worker（`/sd/`、`/pv/`、`/api/` 分发）
- `LICENSE`

Cloudflare Pages 部署时各项目使用独立的构建根目录：SD 应用配置 **Root directory = `sd`**（其余步骤见 `sd/README.md`）。
