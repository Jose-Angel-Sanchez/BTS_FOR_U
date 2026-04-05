import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFeedStore } from '../src/store';
import { scrapeBtsImages } from '../src/scraper';
import { writeFeedStore } from '../src/store';

function normalizeMember(memberRaw: string): string {
  const member = memberRaw.toLowerCase().trim();
  const allowed = new Set(['rm', 'jin', 'suga', 'j-hope', 'jhope', 'jimin', 'v', 'jungkook']);
  return allowed.has(member) ? (member === 'jhope' ? 'j-hope' : member) : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const page = Number.parseInt(String(req.query.page ?? '0'), 10) || 0;
  const size = Math.max(24, Math.min(72, Number.parseInt(String(req.query.size ?? '36'), 10) || 36));
  const member = normalizeMember(String(req.query.member ?? ''));

  let store = await readFeedStore();
  if (!store || store.items.length === 0) {
    const coldStart = await scrapeBtsImages(260);
    await writeFeedStore(coldStart);
    store = { savedAt: new Date().toISOString(), items: coldStart };
  }

  const scoped = member
    ? store.items.filter((item) => item.member === member || item.title.toLowerCase().includes(member.replace('-', ' ')))
    : store.items;

  const start = page * size;
  const items = scoped.slice(start, start + size);

  return res.status(200).json({
    items,
    page,
    size,
    nextPage: page + 1,
    total: scoped.length,
    savedAt: store.savedAt,
    source: 'backend_api_cache',
  });
}
