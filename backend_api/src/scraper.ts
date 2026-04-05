import type { FeedImage } from './types';

const IMAGE_EXT = /\.(jpg|jpeg|png|webp)(\?.*)?$/i;

const MEMBER_ALIASES: Record<string, string[]> = {
  rm: ['rm', 'namjoon', 'kim namjoon'],
  jin: ['jin', 'seokjin', 'kim seokjin'],
  suga: ['suga', 'yoongi', 'agust d', 'min yoongi'],
  'j-hope': ['j-hope', 'jhope', 'hoseok', 'jung hoseok'],
  jimin: ['jimin', 'park jimin'],
  v: ['v', 'taehyung', 'kim taehyung'],
  jungkook: ['jungkook', 'jeon jungkook', 'jungkook'],
};

function detectMember(text: string): string | null {
  const normalized = text.toLowerCase();
  for (const [member, aliases] of Object.entries(MEMBER_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) return member;
  }
  return null;
}

function normalizeImageUrl(url: string): string | null {
  if (!url) return null;
  const next = url.replace(/^http:\/\//i, 'https://');
  if (!next.startsWith('https://')) return null;
  if (!IMAGE_EXT.test(next) && !next.includes('preview.redd.it') && !next.includes('i.redd.it') && !next.includes('upload.wikimedia.org')) {
    return null;
  }
  return next;
}

function mapItem(id: string, title: string, url: string, source: string, width?: number, height?: number): FeedImage | null {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;

  const member = detectMember(`${title} ${normalized}`);
  return {
    id,
    type: 'image',
    title: title.trim().slice(0, 180) || 'BTS image',
    url: normalized,
    source,
    member,
    width,
    height,
    tags: ['bts', source, member ?? 'group'],
  };
}

async function fetchRedditImages(subreddit: string): Promise<FeedImage[]> {
  const endpoint = `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`;

  const res = await fetch(endpoint, {
    headers: {
      'User-Agent': 'bts-backend-api/1.0',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return [];
  const data = await res.json() as {
    data?: {
      children?: Array<{
        data?: {
          id?: string;
          title?: string;
          url?: string;
          post_hint?: string;
          preview?: { images?: Array<{ source?: { width?: number; height?: number; url?: string } }> };
        };
      }>;
    };
  };

  const children = data.data?.children ?? [];
  const items: FeedImage[] = [];

  for (const child of children) {
    const post = child.data;
    if (!post?.id || !post.title) continue;

    const preview = post.preview?.images?.[0]?.source;
    const candidateUrl = preview?.url?.replace(/&amp;/g, '&') || post.url || '';

    const mapped = mapItem(
      `reddit-${subreddit}-${post.id}`,
      post.title,
      candidateUrl,
      `reddit:${subreddit}`,
      preview?.width,
      preview?.height,
    );

    if (mapped) items.push(mapped);
  }

  return items;
}

async function fetchWikimediaImages(): Promise<FeedImage[]> {
  const query = new URL('https://commons.wikimedia.org/w/api.php');
  query.searchParams.set('action', 'query');
  query.searchParams.set('format', 'json');
  query.searchParams.set('origin', '*');
  query.searchParams.set('generator', 'search');
  query.searchParams.set('gsrsearch', 'BTS kpop concert photo');
  query.searchParams.set('gsrlimit', '50');
  query.searchParams.set('prop', 'imageinfo');
  query.searchParams.set('iiprop', 'url|size');

  const res = await fetch(query.toString(), { cache: 'no-store' });
  if (!res.ok) return [];

  const data = await res.json() as {
    query?: {
      pages?: Record<string, {
        pageid?: number;
        title?: string;
        imageinfo?: Array<{ url?: string; width?: number; height?: number }>;
      }>;
    };
  };

  const pages = Object.values(data.query?.pages ?? {});
  const items: FeedImage[] = [];

  for (const page of pages) {
    const image = page.imageinfo?.[0];
    if (!image?.url || !page.pageid) continue;

    const mapped = mapItem(
      `wiki-${page.pageid}`,
      page.title ?? 'Wikimedia BTS image',
      image.url,
      'wikimedia',
      image.width,
      image.height,
    );

    if (mapped) items.push(mapped);
  }

  return items;
}

export async function scrapeBtsImages(limit = 180): Promise<FeedImage[]> {
  const [redditBangtan, redditBts7, wiki] = await Promise.all([
    fetchRedditImages('bangtan'),
    fetchRedditImages('bts7'),
    fetchWikimediaImages(),
  ]);

  const merged = [...redditBangtan, ...redditBts7, ...wiki]
    .filter((item) => item.url.includes('https://'))
    .slice(0, Math.max(limit * 2, 200));

  const uniqueMap = new Map<string, FeedImage>();
  for (const item of merged) {
    if (!uniqueMap.has(item.url)) uniqueMap.set(item.url, item);
  }

  return Array.from(uniqueMap.values()).slice(0, limit);
}
