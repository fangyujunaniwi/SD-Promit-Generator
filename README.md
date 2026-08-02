# SD-Promit-Generator

Stable Diffusion 提示词生成器（单页应用），支持按分类浏览/搜索标签、组合生成提示词、后台管理标签库，并通过 Supabase 云端同步数据。

线上地址：https://sd-prompt-generator.pages.dev

## 功能特性

- **提示词生成**：按分类浏览标签，点击加入/移出，实时生成正向与负面提示词
- **全局搜索**：按标签名 / 中文说明 / 分类快速检索
- **权重调节**：每个标签可设置权重（0.1 – 2.0），生成时按权重输出
- **后台管理**（仅管理员）：
  - 分类管理：新增 / 重命名 / 改色 / 隐藏 / 删除 / 合并
  - 标签管理：批量新增、搜索筛选、编辑（名称 / 中文说明 / 分类 / 权重）、删除
- **建议反馈**（仅登录用户）：提交建议，管理员可查看 / 删除
- **云端同步**：标签数据存入 Supabase，浏览器本地做缓存兜底
- **人机验证**：Vaptcha V4 滑块验证 + 服务端二次校验，与 Supabase 认证解耦

## 技术栈

- 纯前端单页应用（原生 HTML / CSS / JS，`index.html`）
- [Supabase](https://supabase.com)（Auth + Postgres）经 CDN 引入的 `@supabase/supabase-js`
- Vaptcha V4 SDK（`https://c4.vaptcha.com/src/v4.js`），服务端校验走 `https://v41.vaptcha.com/api/verify`
- Serverless 函数读取环境变量，适配三种平台：Vercel / Netlify / Cloudflare Pages

## 目录结构

```
├── index.html                  # 主应用（全部前端逻辑与样式）
├── api/
│   ├── captcha.js              # Vercel：Vaptcha 二次校验
│   └── config.js               # Vercel：暴露公开配置（VAPTCHA_VID）
├── netlify/
│   └── functions/
│       ├── captcha.js          # Netlify 校验函数
│       └── config.js           # Netlify 配置函数
├── functions/
│   └── api/
│       ├── captcha.js          # Cloudflare Pages 校验函数
│       └── config.js           # Cloudflare Pages 配置函数
└── README.md
```

## 数据表（Supabase）

| 表 | 说明 |
|---|---|
| `sd_data` | 单行存储全部标签数据：`{ version, categories, tags, savedAt }`，读写用 upsert 单行策略 |
| `suggestions` | 建议反馈：`id` + 提交内容等字段 |
| `admins` | 管理员名单（`email` 匹配即管理员），后台入口仅管理员可见 |

> 注意：代码不依赖 `sd_data.updated_at` 列，也兼容任意主键类型（读取用 `.limit(1).maybeSingle()`）。

## 部署（Cloudflare Pages）

1. 将本仓库连接到 Cloudflare Pages（Build 命令留空，输出目录留空，直接部署根目录静态站点）
2. 在 **Settings → Environment variables** 配置环境变量（见下）
3. 每次修改环境变量后需手动 **Redeploy** 生效

### 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `VAPTCHA_VID` | 是 | Vaptcha V4 验证单元 ID（公开，用于前端初始化） |
| `VAPTCHA_VKEY` | 是 | Vaptcha 密钥（机密，**只配置在服务端**，前端不可见） |
| `SUPABASE_URL` | 是 | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | 是 | Supabase anon 公钥 |

## Vaptcha 说明

- **必须使用 V4**（V3 的 SDK / 验证域名 `v.vaptcha.com`、`v-cn.vaptcha.com`、`cdn.vaptcha.com` 已被 DNS 封锁）
- 前端流程：`vaptcha({ vid, container, lang: 'zh-CN' })` 初始化 → `validate()` 获取 `{ token, knock, dfu, ip }` → 登录/注册前调 `/api/captcha` 校验
- 服务端校验：`POST https://v41.vaptcha.com/api/verify`，body 含 `vid, vkey, token, knock, dfu, ip`，返回 `data.result === true` 才算通过
- 各平台校验端点：Vercel `/api/captcha`、Netlify `/.netlify/functions/captcha`、Cloudflare Pages `/api/captcha`
- **Supabase 的 CAPTCHA（Bot and Abuse Protection）必须保持关闭**，验证与 Supabase 完全解耦，不传 captchaToken

## 本地开发

```bash
# 需要本地跑 serverless 时，按平台在本地注入环境变量后启动：
vercel dev          # Vercel
netlify dev         # Netlify
wrangler pages dev  # Cloudflare Pages
```

纯静态部分可直接用任意静态服务器打开 `index.html`，但人机验证 / 配置接口需要 serverless 函数支持。

## 常见问题

- **登录提示验证码校验失败**：检查 Vaptcha 返回码——`code 1` 鉴权不过（常见 IP 不一致）、`code 2` token 过期、`code 3/4` token 不存在或其它
- **提示 `missing: VAPTCHA_VKEY`**：服务端未读取到 Vaptcha 密钥，检查环境变量是否已配置并已 Redeploy
