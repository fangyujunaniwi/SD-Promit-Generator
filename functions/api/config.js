export function onRequest(context) {
  return new Response(JSON.stringify({
    SUPABASE_URL: context.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: context.env.SUPABASE_ANON_KEY || '',
    VAPTCHA_VID: context.env.VAPTCHA_VID || '',
    HOME_URL: context.env.HOME_URL || '',
    GITHUB_URL: context.env.GITHUB_URL || '',
    STORAGE_BACKEND: context.env.STORAGE_BACKEND || 'supabase'
  }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
