import { kv } from '@vercel/kv';
import type { FeedImage, FeedStore } from './types';

const FEED_KEY = 'bts:feed:v1';

export async function readFeedStore(): Promise<FeedStore | null> {
  try {
    const data = await kv.get<FeedStore>(FEED_KEY);
    if (!data || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function writeFeedStore(items: FeedImage[]): Promise<void> {
  const next: FeedStore = {
    savedAt: new Date().toISOString(),
    items,
  };

  await kv.set(FEED_KEY, next);
}

export function dedupeByUrl(items: FeedImage[]): FeedImage[] {
  const seen = new Set<string>();
  const next: FeedImage[] = [];

  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    next.push(item);
  }

  return next;
}
