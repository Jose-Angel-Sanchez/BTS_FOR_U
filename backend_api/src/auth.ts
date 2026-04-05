import type { VercelRequest } from '@vercel/node';

export function isAuthorizedRefresh(req: VercelRequest): boolean {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return false;

  const token = auth.slice('Bearer '.length).trim();
  if (!token) return false;

  const cronSecret = process.env.CRON_SECRET;
  const manualSecret = process.env.API_REFRESH_TOKEN;

  return token === cronSecret || token === manualSecret;
}
