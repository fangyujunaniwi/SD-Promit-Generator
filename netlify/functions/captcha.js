exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'method not allowed' }) };
  }
  let token = '';
  try { token = (JSON.parse(event.body || '{}').token) || ''; } catch (e) {}
  if (!token) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'missing token' }) };
  }
  const vid = process.env.VAPTCHA_VID || '';
  const key = process.env.VAPTCHA_KEY || '';
  if (!vid || !key) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'vaptcha not configured' }) };
  }
  const ip = (event.headers['x-nf-client-connection-ip'] || '').split(',')[0].trim();
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
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: data.success === 1 }) };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, msg: 'vaptcha validate request failed' }) };
  }
};
