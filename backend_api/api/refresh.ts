import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorizedRefresh } from '../src/auth';
import { scrapeBtsImages } from '../src/scraper';
import { dedupeByUrl, writeFeedStore } from '../src/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorizedRefresh(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const scraped = await scrapeBtsImages(260);
    const deduped = dedupeByUrl(scraped);
    await writeFeedStore(deduped);

    return res.status(200).json({
      ok: true,
      savedAt: new Date().toISOString(),
      count: deduped.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'refresh_failed',
    });
  }
}
