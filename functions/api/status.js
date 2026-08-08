/**
 * 存储后端状态检测（后台"连接状态"区使用）
 * GET /api/status → 返回当前后端模式、各依赖配置与连接情况
 * 不包含任何密钥/连接串，可公开访问
 */
import { connect } from '@tidbcloud/serverless';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequest(context) {
  const { env } = context;
  const backend = String(env.STORAGE_BACKEND || 'supabase').toLowerCase();
  const tidbUrl = env.TIDB_DATABASE_URL || '';
  const tidbConfigured = !!tidbUrl;

  let tidbConnected = false;
  let tidbError = null;
  let dataFound = false;
  let savedAt = null;
  let suggestionsCount = 0;

  if (tidbConfigured) {
    try {
      const conn = connect({ url: tidbUrl });
      await conn.execute('SELECT 1');
      tidbConnected = true;
      try {
        const r = await conn.execute('SELECT data_key, saved_at FROM sd_data WHERE data_key = ? LIMIT 1', ['main']);
        const rRows = Array.isArray(r) ? r : ((r && r.rows) || []);
        if (rRows.length) {
          dataFound = true;
          savedAt = rRows[0].saved_at || null;
        }
      } catch (e) { /* sd_data 表缺失等情况，仅影响数据状态 */ }
      try {
        const r = await conn.execute('SELECT COUNT(*) AS cnt FROM suggestions');
        const rRows = Array.isArray(r) ? r : ((r && r.rows) || []);
        if (rRows[0]) suggestionsCount = Number(rRows[0].cnt) || 0;
      } catch (e) { /* suggestions 表缺失 */ }
    } catch (e) {
      tidbError = e.message;
    }
  }

  return json({
    storageBackend: backend,
    supabaseConfigured: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    tidbConfigured: tidbConfigured,
    tidbConnected: tidbConnected,
    tidbError: tidbError,
    dataFound: dataFound,
    savedAt: savedAt,
    suggestionsCount: suggestionsCount
  });
}
