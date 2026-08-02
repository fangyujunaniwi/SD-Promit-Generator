exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'method not allowed' }) };
  }
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const token = body.token || '';
  if (!token) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'missing token' }) };
  }
  const vid = process.env.VAPTCHA_VID || '';
  const vkey = process.env.VAPTCHA_VKEY || '';
  if (!vid || !vkey) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'vaptcha not configured' }) };
  }
  const ip = body.ip || (event.headers['x-nf-client-connection-ip'] || '').split(',')[0].trim();
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
    const ok = !!(data && data.data && data.data.result === true);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: ok }) };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'vaptcha verify request failed' }) };
  }
};
