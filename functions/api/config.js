export function onRequest(context) {
  return new Response(JSON.stringify({
    SUPABASE_URL: context.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: context.env.SUPABASE_ANON_KEY || ''
  }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
