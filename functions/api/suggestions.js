/**
 * 建议反馈数据代理（STORAGE_BACKEND=tidb 时使用）
 * - POST   /api/suggestions        ：任何人提交（与 Supabase 的"建议 任何人提交"策略一致）
 * - GET    /api/suggestions        ：管理员读取（Bearer 携带 Supabase 登录态，服务端校验 admins 表）
 * - DELETE /api/suggestions?id=xxx ：管理员删除
 * 依赖 TiDB 建表：
 *   CREATE TABLE IF NOT EXISTS suggestions (
 *     id VARCHAR(64) PRIMARY KEY,
 *     title TEXT,
 *     content TEXT NOT NULL,
 *     email TEXT,
 *     created_at BIGINT
 *   );
 */
import { connect } from '@tidbcloud/serverless';
import { verifyUser, checkAdmin } from './_auth.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequest(context) {
  const { env, request } = context;
  const dbUrl = env.TIDB_DATABASE_URL || '';
  if (!dbUrl) return json({ error: 'TIDB_DATABASE_URL 未配置' }, 503);

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const method = request.method;

  if (method === 'POST') {
    let payload = null;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: '请求体不是合法 JSON' }, 400);
    }
    const content = payload && typeof payload.content === 'string' ? payload.content.trim() : '';
    if (!content) return json({ error: '缺少 content 字段' }, 400);
    const id = payload && payload.id ? String(payload.id) : 's-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    const title = payload && payload.title ? String(payload.title).slice(0, 200) : null;
    const email = payload && payload.email ? String(payload.email).slice(0, 200) : null;

    try {
      const conn = connect({ url: dbUrl });
      await conn.execute(
        'INSERT INTO suggestions (id, title, content, email, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, title, content, email, Date.now()]
      );
      return json({ ok: true, id: id });
    } catch (e) {
      return json({ error: '建议提交失败: ' + e.message }, 500);
    }
  }

  if (method === 'GET' || method === 'DELETE') {
    if (!token) return json({ error: '未登录' }, 401);
    const uid = await verifyUser(env, token);
    if (!uid) return json({ error: '登录态无效' }, 401);
    const admin = await checkAdmin(env, uid, token);
    if (!admin) return json({ error: '无管理员权限' }, 403);

    try {
      const conn = connect({ url: dbUrl });
      if (method === 'GET') {
        const result = await conn.execute(
          'SELECT id, title, content, email, created_at FROM suggestions ORDER BY created_at DESC LIMIT 100'
        );
        const rows = (result && result.rows) ? result.rows : [];
        const list = rows.map(function (r) {
          return {
            id: r.id,
            title: r.title,
            content: r.content,
            email: r.email,
            created_at: r.created_at ? new Date(r.created_at).toISOString() : null
          };
        });
        return json({ list: list });
      }
      const id = new URL(request.url).searchParams.get('id');
      if (!id) return json({ error: '缺少 id 参数' }, 400);
      await conn.execute('DELETE FROM suggestions WHERE id = ?', [id]);
      return json({ ok: true });
    } catch (e) {
      return json({ error: '操作失败: ' + e.message }, 500);
    }
  }

  return json({ error: '不支持的请求方法' }, 405);
}
