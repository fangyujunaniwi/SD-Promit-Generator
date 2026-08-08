/**
 * 云端数据读取（共享模块，供 rss / tidb 等函数使用）
 * 按环境变量 STORAGE_BACKEND 选择后端：
 *   - supabase（默认）：REST + anon key 直读
 *   - tidb：TiDB Cloud Serverless 驱动读取
 * 返回 { found, categories, tags }
 */
import { connect } from '@tidbcloud/serverless';

async function loadFromSupabase(env) {
  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return { found: false, categories: [], tags: [] };
  try {
    const resp = await fetch(url + '/rest/v1/sd_data?select=data&limit=1', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
      cf: { cacheTtl: -1 }
    });
    if (!resp.ok) return { found: false, categories: [], tags: [] };
    const rows = await resp.json();
    if (!rows || !rows[0] || !rows[0].data) return { found: false, categories: [], tags: [] };
    const d = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    return {
      found: true,
      categories: (d && d.categories && Array.isArray(d.categories)) ? d.categories : [],
      tags: (d && d.tags && Array.isArray(d.tags)) ? d.tags : []
    };
  } catch (e) {
    return { found: false, categories: [], tags: [] };
  }
}

async function loadFromTiDB(env) {
  const url = env.TIDB_DATABASE_URL || '';
  if (!url) return { found: false, categories: [], tags: [] };
  try {
    const conn = connect({ url });
    try {
      const result = await conn.execute(
        'SELECT data FROM sd_data WHERE data_key = ? LIMIT 1',
        ['main']
      );
      const rows = (result && result.rows) ? result.rows : [];
      if (!rows.length) return { found: false, categories: [], tags: [] };
      const raw = rows[0].data;
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        found: true,
        categories: (d && d.categories && Array.isArray(d.categories)) ? d.categories : [],
        tags: (d && d.tags && Array.isArray(d.tags)) ? d.tags : []
      };
    } finally {
      await conn.close();
    }
  } catch (e) {
    return { found: false, categories: [], tags: [] };
  }
}

export async function loadCloudData(env) {
  const backend = String(env.STORAGE_BACKEND || 'supabase').toLowerCase();
  if (backend === 'tidb') return await loadFromTiDB(env);
  return await loadFromSupabase(env);
}
