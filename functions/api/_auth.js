/**
 * 共享鉴权模块（供 tidb / suggestions 等函数使用）
 * 登录态与管理员白名单仍由 Supabase 校验（认证服务），数据存储层可为 TiDB。
 */
export async function verifyUser(env, token) {
  try {
    const resp = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (resp.ok) {
      const u = await resp.json();
      return u && u.id ? u.id : null;
    }
  } catch (e) { /* 鉴权失败 */ }
  return null;
}

export async function checkAdmin(env, uid, token) {
  try {
    const resp = await fetch(env.SUPABASE_URL + '/rest/v1/admins?select=user_id&user_id=eq.' + encodeURIComponent(uid) + '&limit=1', {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (resp.ok) {
      const rows = await resp.json();
      return Array.isArray(rows) && rows.length > 0;
    }
  } catch (e) { /* 鉴权失败 */ }
  return false;
}
