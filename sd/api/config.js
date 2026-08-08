export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    VAPTCHA_VID: process.env.VAPTCHA_VID || '',
    HOME_URL: process.env.HOME_URL || '',
    GITHUB_URL: process.env.GITHUB_URL || ''
  });
}
