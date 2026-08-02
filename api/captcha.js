export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, msg: 'method not allowed' });
    return;
  }
  const body = req.body || {};
  const token = body.token || '';
  if (!token) {
    res.status(400).json({ ok: false, msg: 'missing token' });
    return;
  }
  const vid = process.env.VAPTCHA_VID || '';
  const vkey = process.env.VAPTCHA_VKEY || '';
  if (!vid || !vkey) {
    res.status(200).json({ ok: false, msg: 'vaptcha not configured (set VAPTCHA_VID/VAPTCHA_VKEY)' });
    return;
  }
  const ip = body.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
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
    res.status(200).json({ ok: ok, msg: d.note || data.msg || 'verify failed', code: typeof d.code !== 'undefined' ? d.code : (data.code !== undefined ? data.code : null) });
  } catch (e) {
    res.status(200).json({ ok: false, msg: 'vaptcha verify request failed: ' + (e && e.message ? e.message : String(e)) });
  }
}
