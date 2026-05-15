const { kv } = require('@vercel/kv');

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function sanitize(s) {
  return s.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 30);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, alias } = req.body || {};

  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Normalize and validate URL
  let normalizedURL = url.trim();
  if (!/^https?:\/\//i.test(normalizedURL)) normalizedURL = 'https://' + normalizedURL;
  try { new URL(normalizedURL); } catch {
    return res.status(400).json({ error: 'Please enter a valid URL' });
  }

  const code = alias ? sanitize(alias) : randCode();
  if (!code) return res.status(400).json({ error: 'Invalid alias — use letters, numbers, hyphens only' });

  try {
    // Reject duplicate aliases
    const existing = await kv.get(`link:${code}`);
    if (existing) return res.status(409).json({ error: 'That alias is already taken. Try another.' });

    // Store alias → url
    await kv.set(`link:${code}`, normalizedURL);

    // Store metadata for analytics / click counting
    await kv.set(`meta:${code}`, JSON.stringify({
      url: normalizedURL,
      created: new Date().toISOString(),
      clicks: 0,
    }));

    return res.status(200).json({ alias: code, url: normalizedURL });
  } catch (err) {
    console.error('KV error:', err);
    return res.status(500).json({ error: 'Storage unavailable. Make sure Vercel KV is connected.' });
  }
};
