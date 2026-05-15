const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  const alias = req.query.alias;

  if (!alias) return res.status(400).send('Missing alias');

  try {
    const url = await kv.get(`link:${alias}`);

    if (!url) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Link not found — snip.</title>
  <style>
    body{margin:0;font-family:'Segoe UI',sans-serif;background:#07070d;color:#edead3;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    .wrap{padding:40px 24px}
    h1{font-size:48px;font-weight:700;margin:0 0 12px;color:#f87171}
    p{color:#8888a2;font-size:16px;margin:0 0 28px}
    a{display:inline-block;padding:10px 24px;background:#00e096;color:#07070d;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px}
    a:hover{background:#00b87a}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>404</h1>
    <p>The short link <strong style="color:#edead3">/${alias}</strong> doesn't exist or has expired.</p>
    <a href="/">← Back to snip.</a>
  </div>
</body>
</html>`);
    }

    // Increment click count asynchronously (fire and forget)
    kv.get(`meta:${alias}`).then(raw => {
      if (raw) {
        const meta = typeof raw === 'string' ? JSON.parse(raw) : raw;
        meta.clicks = (meta.clicks || 0) + 1;
        kv.set(`meta:${alias}`, JSON.stringify(meta));
      }
    }).catch(() => {});

    // 302 so browsers don't cache — allows destination changes and accurate analytics
    return res.redirect(302, url);
  } catch (err) {
    console.error('KV error:', err);
    return res.status(500).send('Storage unavailable');
  }
};
