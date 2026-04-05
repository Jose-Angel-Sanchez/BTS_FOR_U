import { NextResponse } from 'next/server';
import { btsMemberProfiles } from '@/lib/btsMembers';
import { fetchBtsImages } from '@/lib/btsScraper';

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

function getBackendBaseUrl(): string | null {
  const raw = (process.env.BACKEND_API_URL ?? '').trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

async function fetchItemsFromBackendApi(page: number, size: number, member: string): Promise<Array<{
  id: string;
  title: string;
  url: string;
  member?: string | null;
  source?: string;
  tags?: string[];
  width?: number;
  height?: number;
}> | null> {
  const base = getBackendBaseUrl();
  if (!base) return null;

  const endpoint = new URL('/api/feed', `${base}/`);
  endpoint.searchParams.set('page', String(page));
  endpoint.searchParams.set('size', String(size));
  if (member) endpoint.searchParams.set('member', member);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(endpoint.toString(), {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = await response.json() as {
      items?: Array<{
        id: string;
        title: string;
        url: string;
        member?: string | null;
        source?: string;
        tags?: string[];
        width?: number;
        height?: number;
      }>;
    };

    if (!Array.isArray(data.items)) return null;
    return data.items;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number.parseInt(searchParams.get('page') ?? '0', 10) || 0;
  const size = Math.max(24, Math.min(72, Number.parseInt(searchParams.get('size') ?? '48', 10) || 48));
  const member = (searchParams.get('member') ?? '').toLowerCase();

  const normalizedMember = btsMemberProfiles.some((item) => item.id === member) ? member : '';

  let items: Array<{
    id: string;
    title: string;
    url: string;
    member?: string | null;
    source?: string;
    tags?: string[];
    width?: number;
    height?: number;
  }> = [];

  const fromBackendApi = await fetchItemsFromBackendApi(page, size, normalizedMember);
  if (fromBackendApi && fromBackendApi.length > 0) {
    items = fromBackendApi;
  }

  if (items.length === 0) {
    try {
      const scraped = await fetchBtsImages(page, size * 3, normalizedMember || undefined);
      const seen = new Set<string>();
      items = scraped.filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      }).slice(0, size);
    } catch {
      return NextResponse.json({ items: [], images: [], page, size, nextPage: page + 1 });
    }
  }

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
      width: item.width,
      height: item.height,
      tags: item.tags ?? ['bts'],
    }))
    .filter((item) => item.url.startsWith('https://'));

  return NextResponse.json({
    items: normalizedItems,
    images: normalizedItems.map((item) => ({ id: item.id, title: item.title, url: item.url })),
    page,
    size,
    nextPage: page + 1,
  });
}