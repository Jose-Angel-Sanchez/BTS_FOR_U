import { NextResponse } from 'next/server';

const NOISE_PATTERN = /bangkok|skytrain|rail|metro|station|transit|bus rapid|\bn\d{1,3}\b|opaque|feather|logo|icon|symbol/i;
const BTS_PERSON_PATTERN = /\bbts\b|bangtan|방탄소년단|kpop|idol|hybe|bighit|music awards?|concert|performance|press conference|namjoon|seokjin|yoongi|hoseok|jimin|taehyung|jungkook|\brm\b|\bjin\b|\bsuga\b|j-hope|jhope/i;

const MEMBER_MAP: Record<string, string[]> = {
  rm: ['rm', 'namjoon', 'kim namjoon', 'rap monster'],
  jin: ['jin', 'seokjin', 'kim seokjin'],
  suga: ['suga', 'yoongi', 'agust d', 'min yoongi'],
  'j-hope': ['jhope', 'j-hope', 'hoseok', 'jung hoseok'],
  jhope: ['jhope', 'j-hope', 'hoseok', 'jung hoseok'],
  jimin: ['jimin', 'park jimin'],
  v: ['taehyung', 'kim taehyung', 'v of bts'],
  jungkook: ['jungkook', 'jung kook', 'jeon jungkook'],
};

function hasMemberAlias(text: string, alias: string): boolean {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number.parseInt(searchParams.get('page') ?? '0', 10) || 0;
  const size = Math.max(24, Math.min(72, Number.parseInt(searchParams.get('size') ?? '48', 10) || 48));
  const member = (searchParams.get('member') ?? '').toLowerCase();

  const feedUrl = new URL('/api/feed', request.url);
  feedUrl.searchParams.set('page', String(page));
  feedUrl.searchParams.set('size', String(size));
  if (member) {
    feedUrl.searchParams.set('member', member);
  }

  const response = await fetch(feedUrl.toString(), {
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ items: [], images: [], page, size, nextPage: page + 1 }, { status: response.status });
  }

  const data = await response.json() as {
    items: Array<{ id: string; title: string; url: string; member?: string | null; source?: string; tags?: string[] }>;
    nextPage?: number;
  };

  let items = data.items ?? [];

  // 🔥 FILTRO REAL POR INTEGRANTE
  if (member && MEMBER_MAP[member]) {
    const keywords = MEMBER_MAP[member];

    items = items.filter((item) => {
      const text = `${item.title} ${item.url}`.toLowerCase();
      return keywords.some((alias) => hasMemberAlias(text, alias));
    });
  }

  // 🔥 LIMPIEZA
  const normalizedItems = items
    .filter((item) => item.url?.startsWith('http'))
    .filter((item) => {
      const text = `${item.title} ${item.url} ${item.member ?? ''}`.toLowerCase();
      return BTS_PERSON_PATTERN.test(text) && !NOISE_PATTERN.test(text);
    })
    .map((item) => ({
      id: item.id,
      type: 'image' as const,
      title: item.title,
      url: item.url.replace(/^http:\/\//i, 'https://'),
      source: item.source ?? 'bts-images',
      member: item.member ?? null,
      tags: item.tags ?? ['bts'],
    }))
    .filter((item) => item.url.startsWith('https://'));

  return NextResponse.json({
    items: normalizedItems,
    images: normalizedItems.map((item) => ({ id: item.id, title: item.title, url: item.url })),
    page,
    size,
    nextPage: data.nextPage ?? page + 1,
  });
}