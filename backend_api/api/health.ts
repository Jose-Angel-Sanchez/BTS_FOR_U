import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFeedStore } from '../src/store';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const store = await readFeedStore();

  return res.status(200).json({
    ok: true,
    service: 'bts-backend-api',
    hasFeed: !!store,
    savedAt: store?.savedAt ?? null,
    count: store?.items.length ?? 0,
    now: new Date().toISOString(),
  });
}
