# SD-Prompt-Generator

Stable Diffusion 提示词生成器：按分类浏览/搜索标签，组合生成正向与负面提示词，管理员可在后台维护标签库，数据云端同步（Supabase 或 TiDB Cloud 二选一）。

线上DEMO：https://niwi.cc/sd/

## 功能

- 标签浏览 / 全局搜索 / 权重调节（0.1–2.0）/ 实时生成提示词
- 后台管理（仅管理员）：分类增删改色隐藏合并、标签批量新增/编辑/删除
- 建议反馈（登录用户可提交，管理员可管理）
- 标签数据云端同步（Supabase 或 TiDB 可选），本地缓存兜底
- Vaptcha V4 人机验证（服务端二次校验，与 Supabase 认证解耦）
- 移动端适配（底部操作栏、提示词弹层、响应式布局）

## 目录结构

```
index.html                # 主应用（全部前端逻辑与样式）
package.json              # 根依赖（@tidbcloud/serverless，Pages 构建安装）
api/                      # Vercel 函数（config / captcha 校验）
netlify/functions/        # Netlify 函数
functions/api/            # Cloudflare Pages 函数
  ├── config.js           #   前端配置（暴露环境变量）
  ├── captcha.js          #   Vaptcha 服务端校验
  ├── _data.js            #   云端数据读取（Supabase / TiDB 二选一）
  ├── _auth.js            #   共享鉴权（Supabase 登录态 + admins 白名单）
  ├── tidb.js             #   TiDB 标签数据读写（STORAGE_BACKEND=tidb 时使用）
  └── suggestions.js      #   建议反馈读写（TiDB 模式）
```

## 部署教程（Cloudflare Pages）

### 1. 创建 Supabase 项目并建表

1. 注册 https://supabase.com → 新建项目（免费 512MB 足够个人使用）
2. 左侧 **SQL Editor** → New query，粘贴执行下方 SQL：

```sql
-- 标签数据（单行 JSONB）
create table if not exists sd_data (
  id integer primary key,
  data jsonb
);

-- 建议反馈
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  email text,
  created_at timestamptz
);

-- 管理员白名单（user_id 为 Supabase Auth 用户的 UUID）
create table if not exists admins (
  user_id uuid primary key references auth.users(id),
  email text
);

-- ===== 行级安全策略 =====
alter table sd_data enable row level security;
create policy "sd_data 公开读" on sd_data for select using (true);
create policy "sd_data 管理员写" on sd_data for insert
  with check (auth.uid() in (select user_id from admins));
create policy "sd_data 管理员改" on sd_data for update
  using (auth.uid() in (select user_id from admins));

alter table suggestions enable row level security;
create policy "建议 任何人提交" on suggestions for insert with check (true);
create policy "建议 管理员读" on suggestions for select
  using (auth.uid() in (select user_id from admins));
create policy "建议 管理员删" on suggestions for delete
  using (auth.uid() in (select user_id from admins));

alter table admins enable row level security;
create policy "管理员查自己" on admins for select using (user_id = auth.uid());
```

3. **Authentication → Providers → Email** 开启邮箱登录
4. **Authentication → Users** 创建一个管理员账号，复制其 **User UUID**，在 SQL Editor 执行：

```sql
insert into admins (user_id, email) values ('粘贴用户UUID', '你的邮箱@example.com');
```

5. 确认 **Authentication → 设置** 中的 CAPTCHA（Bot and Abuse Protection）保持**关闭**

### 2. 配置 Vaptcha V4

1. 在 https://www.vaptcha.com 控制台创建 V4 验证单元，取得 `VID` 和 `VKEY`

### 3. 部署到 Cloudflare Pages

1. Fork本仓库
2. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 选择仓库
3. 构建设置：Framework preset 选 **None**，**Build command 填 `npm install`**（安装函数依赖，否则构建会报 `Could not resolve "@tidbcloud/serverless"`），Build output directory 留空 → Deploy
4. 部署完成后到 **Settings → Environment variables** 添加：

| 变量 | 说明 |
|---|---|
| `VAPTCHA_VID` | Vaptcha 验证单元 ID（公开） |
| `VAPTCHA_VKEY` | Vaptcha 密钥（机密，仅服务端使用） |
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase anon 公钥 |
| `HOME_URL` | （可选）首页/返回按钮链接，留空默认当前站点 |
| `GITHUB_URL` | （可选）GitHub 按钮链接，留空隐藏按钮 |

5. 每次修改环境变量后需在 **Deployments** 手动 **Redeploy** 生效
6. 打开网站 → 右上角登录管理员账号 → 后台管理即可编辑标签，建议反馈在后台管理页查看/删除

### 4. （可选）使用 TiDB Cloud 作为数据库

默认数据存储为 Supabase；也可改用 TiDB Cloud Serverless（免费档）作为数据后端，写入鉴权仍走 Supabase 的 `admins` 白名单。

1. 注册 https://tidbcloud.com → 创建 **Serverless** 集群（免费档够用）→ 初始化完成后点击 **Connect**
2. 建表（在 TiDB Cloud SQL Editor 或本地客户端执行）：

```sql
CREATE TABLE IF NOT EXISTS sd_data (
  data_key VARCHAR(64) PRIMARY KEY,
  data JSON NOT NULL,
  saved_at BIGINT
);

CREATE TABLE IF NOT EXISTS suggestions (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  email TEXT,
  created_at BIGINT
);
```

3. 在 **Connect** 页面复制 **General connection** 连接串（`mysql://...` 格式，含用户名密码）
4. Cloudflare Pages → **Settings → Environment variables** 添加：

| 变量 | 说明 |
|---|---|
| `TIDB_DATABASE_URL` | 第 3 步复制的 TiDB 连接串（机密） |
| `STORAGE_BACKEND` | 填 `tidb` 启用；不填默认 `supabase` |

5. 保存后手动 **Redeploy**。启用后首页数据经 `/api/tidb` 读取（`functions/api/tidb.js`），后台保存写入 TiDB `sd_data` 表；建议反馈经 `/api/suggestions`（`functions/api/suggestions.js`）读写 TiDB `suggestions` 表（提交无需登录，查看/删除需管理员）

> 说明：Supabase 仅保留认证职能（登录、邮箱验证、管理员白名单校验），数据全部存于 TiDB

### 5. 部署到 niwi.cc 子路径（可选）

如需挂载到 `https://niwi.cc/sd/`，用 Cloudflare Worker 反向代理 Pages 站点：

```js
// workers/niwi-router.js（示例，本地文件，不属于本仓库）
const SD_ORIGIN = 'https://你的pages域名.pages.dev';
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/sd')) {
      return proxy(url, SD_ORIGIN, '/sd');
    }
    // ...其他路由
  }
};
```

前端已自动适配：页面路径以 `/sd` 开头时，`/api/*` 请求会自动带 `/sd` 前缀，由 Worker 剥离后转发给 Pages。

## 部署到 Vercel / Netlify

- Vercel：自动识别 `api/` 目录，其余流程同上（环境变量在 Vercel 控制台配置）
- Netlify：需把环境变量写进 `netlify/functions/config.js` 等函数读取的变量中，校验端点为 `/.netlify/functions/captcha`

## 未来规划

- 提示词历史记录与一键复制
- 随机生成提示词（一键随机组合标签）
- 深色模式
- 建议反馈状态管理（待处理 / 已处理）
- 标签库版本历史与一键回滚
- 将当前提示词及参数导出为分享链接 / 图片
- 社区共享标签库（订阅他人词库）
- 移动端体验优化

## 常见问题

- **提示 `missing: VAPTCHA_VKEY`**：服务端未读到密钥，检查环境变量并 Redeploy
- **验证码失败**：Vaptcha 返回 `code 1` 鉴权不过（常见 IP 不一致）、`code 2` token 过期、`code 3/4` token 不存在
- **构建失败 `Could not resolve "@tidbcloud/serverless"`**：Pages 的 Build command 必须填 `npm install`（Build command 为空时整个构建阶段包括依赖安装都会被跳过）
- **首页数据空白**：检查 `STORAGE_BACKEND` 对应的后端（`supabase` 或 `tidb`）环境变量与建表是否完成；TiDB 模式未配置 `TIDB_DATABASE_URL` 时接口返回 503
- **TiDB 模式保存失败**：需在后台登录，登录态由 Supabase 校验、写入鉴权需在 `admins` 白名单内
