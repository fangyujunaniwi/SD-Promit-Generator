export async function onRequestPost(context) {
  let token = '';
  try {
    const body = await context.request.json();
    token = body.token || '';
  } catch (e) {}
  if (!token) {
    return new Response(JSON.stringify({ ok: false, msg: 'missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const vid = context.env.VAPTCHA_VID || '';
  const key = context.env.VAPTCHA_KEY || '';
  if (!vid || !key) {
    return new Response(JSON.stringify({ ok: false, msg: 'vaptcha not configured' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const ip = (context.request.headers.get('CF-Connecting-IP') || '').trim();
  const form = new URLSearchParams();
  form.append('id', vid);
  form.append('secretkey', key);
  form.append('token', token);
  if (ip) form.append('ip', ip);
  try {
    const r = await fetch('https://api.vaptcha.com/v2/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await r.json().catch(function() { return {}; });
    return new Response(JSON.stringify({ ok: data.success === 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, msg: 'vaptcha validate request failed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
