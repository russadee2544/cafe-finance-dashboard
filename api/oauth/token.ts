export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Generate OAuth 2.0 Token response for Gemini Spark
  const accessToken = `baanmai_mcp_token_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  const refreshToken = `baanmai_mcp_refresh_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

  return res.status(200).json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400 * 30, // 30 days
    refresh_token: refreshToken,
    scope: 'all'
  });
}
