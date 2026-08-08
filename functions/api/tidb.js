/**
 * TiDB Cloud 数据代理（与 Supabase 并行可选的后端，通过 STORAGE_BACKEND=tidb 启用）
 * - GET  /api/tidb  ：公开读取云端数据（提示词分类 / 标签）
 * - PUT  /api/tidb  ：管理员写入（Bearer 携带 Supabase 登录态，服务端校验 admins 表）
 * 依赖 TiDB 建表：
 *   CREATE TABLE IF NOT EXISTS sd_data (
 *     data_key VARCHAR(64) PRIMARY KEY,
 *     data JSON NOT NULL,
 *     saved_at BIGINT
 *   );
 */
import { connect } from '@tidbcloud/serverless';
import { loadCloudData } from './_data.js';
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

  if (request.method === 'GET') {
    const d = await loadCloudData(env);
    return json({ found: d.found, categories: d.categories, tags: d.tags });
  }

  if (request.method === 'PUT' || request.method === 'POST') {
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: '未登录' }, 401);
    const uid = await verifyUser(env, token);
    if (!uid) return json({ error: '登录态无效' }, 401);
    const admin = await checkAdmin(env, uid);
    if (!admin) return json({ error: '无管理员权限' }, 403);

    let payload = null;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: '请求体不是合法 JSON' }, 400);
    }
    const data = payload && payload.data ? payload.data : null;
    if (!data) return json({ error: '缺少 data 字段' }, 400);

    try {
      const conn = connect({ url: dbUrl });
      try {
        await conn.execute(
          'INSERT INTO sd_data (data_key, data, saved_at) VALUES (?, CAST(? AS JSON), ?) ' +
          'ON DUPLICATE KEY UPDATE data = VALUES(data), saved_at = VALUES(saved_at)',
          ['main', JSON.stringify(data), Date.now()]
        );
      } finally {
        await conn.close();
      }
      return json({ ok: true });
    } catch (e) {
      return json({ error: 'TiDB 写入失败: ' + e.message }, 500);
    }
  }

  return json({ error: '不支持的请求方法' }, 405);
}
