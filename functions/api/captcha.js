export async function onRequestPost(context) {
  let body = {};
  try {
    body = await context.request.json();
  } catch (e) {}
  const token = body.token || '';
  if (!token) {
    return new Response(JSON.stringify({ ok: false, msg: 'missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const vid = context.env.VAPTCHA_VID || '';
  const vkey = context.env.VAPTCHA_VKEY || '';
  if (!vid || !vkey) {
    return new Response(JSON.stringify({ ok: false, msg: 'vaptcha not configured (set VAPTCHA_VID/VAPTCHA_VKEY)' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const ip = body.ip || (context.request.headers.get('CF-Connecting-IP') || '').trim();
  try {
    const r = await fetch('https://v41.vaptcha.com/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vid: vid,
        vkey: vkey,
        token: token,
        knock: body.knock || '',
        dfu: body.dfu || '',
        ip: ip || ''
      })
    });
    const data = await r.json().catch(function() { return {}; });
    const d = data && data.data ? data.data : {};
    const ok = d.result === true;
    return new Response(JSON.stringify({ ok: ok, msg: d.note || data.msg || 'verify failed', code: typeof d.code !== 'undefined' ? d.code : (data.code !== undefined ? data.code : null) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, msg: 'vaptcha verify request failed: ' + (e && e.message ? e.message : String(e)) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
