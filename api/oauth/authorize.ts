export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { client_id, redirect_uri, response_type, state, scope } = req.query || {};

  // If redirect_uri is provided by Google / Gemini Spark
  if (redirect_uri) {
    const authCode = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const url = new URL(redirect_uri as string);
    url.searchParams.set('code', authCode);
    if (state) {
      url.searchParams.set('state', state as string);
    }
    
    // Redirect back to Google's redirect URI
    return res.redirect(302, url.toString());
  }

  // Fallback UI if visited directly in browser
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>Baanmai Cafe MCP - OAuth Authorization</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); text-align: center; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { font-size: 22px; margin: 0 0 12px; color: #38bdf8; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .badge { background: #0369a1; color: #e0f2fe; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; display: inline-block; margin-bottom: 20px; }
        .btn { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn:hover { background: #0369a1; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">☕✨</div>
        <div class="badge">Gemini Spark MCP Ready</div>
        <h1>Baanmai Cafe Finance</h1>
        <p>ระบบเชื่อมต่อ Model Context Protocol (MCP) พร้อมให้บริการสำหรับ Gemini Spark</p>
        <p style="font-size: 12px; color: #64748b;">OAuth Redirect Endpoint Active</p>
      </div>
    </body>
    </html>
  `);
}
