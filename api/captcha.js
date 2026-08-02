export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, msg: 'method not allowed' });
    return;
  }
  const token = (req.body && req.body.token) || '';
  if (!token) {
    res.status(400).json({ ok: false, msg: 'missing token' });
    return;
  }
  const vid = process.env.VAPTCHA_VID || '';
  const key = process.env.VAPTCHA_KEY || '';
  if (!vid || !key) {
    res.status(200).json({ ok: false, msg: 'vaptcha not configured' });
    return;
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
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
    res.status(200).json({ ok: data.success === 1 });
  } catch (e) {
    res.status(200).json({ ok: false, msg: 'vaptcha validate request failed' });
  }
}
