import { btsGroupSearchTerms, btsMemberProfiles } from '@/lib/btsMembers';
import type { FeedImage } from '@/types/feed';

const EXCLUDED_TERMS = ['blackpink', 'twice', 'stray kids', 'newjeans', 'exo', 'nct', 'itzy', 'aespa', 'ive'];
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)(\?.*)?$/i;
const BTS_STRICT_TERMS = ['bangtan', '방탄소년단', 'bangtan sonyeondan', 'bulletproof boy scouts'];
const BTS_SUPPORT_TERMS = ['kpop', 'idol', 'hybe', 'bighit', 'big hit', 'army', 'ot7', 'music', 'award', 'awards', 'concert', 'performance', 'press conference', 'stage', 'photoshoot', 'dispatch', 'kim namjoon', 'kim seokjin', 'min yoongi', 'jung hoseok', 'park jimin', 'kim taehyung', 'jeon jungkook'];
const NON_RELATED_BTS_TERMS = ['bangkok skytrain', 'skytrain', 'bus rapid transit', 'rapid transit', 'railway', 'metro', 'station', 'line n', 'n28', 'opaque', 'feathers'];
const SELFIE_TERMS = ['selfie', 'selca', 'closeup', 'portrait', 'photoshoot', 'dispatch'];
const PERSON_TERMS = ['face', 'member', 'idol', 'artist', 'singer', 'jin', 'suga', 'jimin', 'jungkook', 'taehyung', 'namjoon', 'hoseok', 'rm'];
const SOCIAL_HOSTS = ['instagram.com', 'facebook.com', 'fb.watch', 'tiktok.com'];
const MIN_IMAGE_URL_LENGTH = 24;
const CACHE_TTL_MS = 1000 * 60 * 12;
const URL_COOLDOWN_MS = 1000 * 60 * 45;
const cache = new Map<string, { expiresAt: number; items: FeedImage[] }>();
const recentlyServed = new Map<string, number>();
const TRUSTED_IMAGE_HOST_HINTS = ['gettyimages', 'media.gettyimages.com', 'pinimg.com', 'twimg.com', 'wallpapers.com', 'usbtsarmy.com', 'redd.it', 'redditmedia.com', 'wikimedia.org'];
const REQUESTED_SOURCES = {
  gettyBase: 'https://www.gettyimages.com.mx/fotos/bts',
  usbtsPhotos: 'https://www.usbtsarmy.com/photos',
  pinterestIdeas: 'https://www.pinterest.com/ideas/bts-pictures/951067205805/',
  xProfile: 'https://x.com/btspicstwt_',
  wallpapersBase: 'https://wallpapers.com/bts-pictures',
} as const;
const REQUESTED_SOURCE_NAMES = new Set(['gettyimages', 'usbtsarmy', 'pinterest', 'x', 'wallpapers']);

interface SearchHit {
  url: string;
  title: string;
  source: string;
}

function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sanitizeText(input: string): string {
  return input.replace(/[<>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function toAbsoluteUrl(maybeUrl: string, baseUrl: string): string | null {
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function hostFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isSocialHost(rawUrl: string): boolean {
  const host = hostFromUrl(rawUrl);
  return SOCIAL_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function normalizeImageUrl(rawUrl: string, baseUrl: string): string | null {
  const cleaned = decodeHtmlEntities(rawUrl)
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .trim();

  if (!cleaned || cleaned.length < MIN_IMAGE_URL_LENGTH) return null;

  const absolute = toAbsoluteUrl(cleaned, baseUrl);
  if (!absolute) return null;
  const host = hostFromUrl(absolute);
  const trustedHost = TRUSTED_IMAGE_HOST_HINTS.some((hint) => host.includes(hint));

  if (!absolute.startsWith('http://') && !absolute.startsWith('https://')) return null;
  if (!IMAGE_EXTENSIONS.test(absolute) && !trustedHost && !absolute.includes('cdninstagram') && !absolute.includes('fbcdn') && !absolute.includes('tiktokcdn')) {
    return null;
  }

  return absolute;
}

function isWholeWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function hasBtsContext(haystack: string): boolean {
  const hasStrict = BTS_STRICT_TERMS.some((term) => haystack.includes(term));
  const hasAcronym = isWholeWord(haystack, 'bts');
  const hasSupport = BTS_SUPPORT_TERMS.some((term) => haystack.includes(term));
  return hasStrict || (hasAcronym && hasSupport);
}

function hasNoiseContext(haystack: string): boolean {
  return NON_RELATED_BTS_TERMS.some((term) => haystack.includes(term));
}

export function detectMember(title: string, tags: string[] = []): string | null {
  const haystack = normalizeText(`${title} ${tags.join(' ')}`);
  const hasContext = hasBtsContext(haystack);

  for (const member of btsMemberProfiles) {
    if (
      member.aliases.some((alias) => {
        if (alias.length <= 3) return hasContext && isWholeWord(haystack, alias);
        return haystack.includes(alias);
      })
    ) {
      return member.id;
    }
  }
  return null;
}

export function isLikelyBts(title: string, tags: string[] = []): boolean {
  const haystack = normalizeText(`${title} ${tags.join(' ')}`);
  if (EXCLUDED_TERMS.some((term) => haystack.includes(term))) return false;
  if (hasNoiseContext(haystack)) return false;

  const requestedSourceTagged = tags.some((tag) => REQUESTED_SOURCE_NAMES.has(tag));
  if (requestedSourceTagged && isWholeWord(haystack, 'bts')) return true;

  const hasContext = hasBtsContext(haystack);
  const member = detectMember(title, tags);
  if (!hasContext && !member) return false;

  return !!member || hasContext || haystack.includes('group') || haystack.includes('members') || haystack.includes('ot7') || haystack.includes('official') || haystack.includes('concert') || haystack.includes('performance');
}

function relevanceScore(item: FeedImage): number {
  const haystack = normalizeText(`${item.title} ${item.url} ${item.tags.join(' ')}`);
  let score = 0;

  if (detectMember(item.title, item.tags)) score += 10;
  if (SELFIE_TERMS.some((term) => haystack.includes(term))) score += 6;
  if (PERSON_TERMS.some((term) => haystack.includes(term))) score += 3;
  if (hasBtsContext(haystack)) score += 2;
  if (item.source.includes('instagram') || item.source.includes('facebook') || item.source.includes('tiktok')) score += 2;
  if (hasNoiseContext(haystack)) score -= 20;

  return score;
}

function chooseSearchTerms(page: number, member?: string): string[] {
  if (member) {
    const profile = btsMemberProfiles.find((item) => item.id === member);
    if (!profile) return btsGroupSearchTerms.slice(0, 2);
    return profile.searchTerms;
  }

  const rotatingMember = btsMemberProfiles[page % btsMemberProfiles.length];
  return [btsGroupSearchTerms[page % btsGroupSearchTerms.length], rotatingMember.searchTerms[page % rotatingMember.searchTerms.length]];
}

function rotateProfiles(page: number, take: number): typeof btsMemberProfiles {
  const rotated: typeof btsMemberProfiles = [];
  for (let i = 0; i < take; i += 1) {
    rotated.push(btsMemberProfiles[(page + i) % btsMemberProfiles.length]);
  }
  return rotated;
}

function buildPlatformQueries(page: number, member?: string): string[] {
  const terms = new Set<string>(chooseSearchTerms(page, member));
  if (!member) {
    for (const profile of rotateProfiles(page, 3)) {
      for (const term of profile.searchTerms) terms.add(term);
    }
  }

  const focus = ['instagram', 'facebook', 'tiktok'];

  const queries: string[] = [];
  for (const term of terms) {
    queries.push(`${term} photos`);
    queries.push(`${term} concert photos`);
    queries.push(`${term} kpop idol photo`);
    queries.push(`${term} selfie`);
    queries.push(`${term} selca`);
    queries.push(`${term} fansite photo`);
    queries.push(`${term} stage photo`);
    for (const network of focus) {
      queries.push(`${term} site:${network}.com`);
      queries.push(`${term} ${network} post`);
      queries.push(`${term} ${network} reel`);
    }
  }

  return Array.from(new Set(queries));
}

function makeFeedImage(input: FeedImage): FeedImage {
  return input;
}

function hashId(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function pickDiverseBySource(items: FeedImage[], targetSize: number): FeedImage[] {
  const bySource = new Map<string, FeedImage[]>();
  for (const item of items) {
    const list = bySource.get(item.source) ?? [];
    list.push(item);
    bySource.set(item.source, list);
  }

  const preferredOrder = ['usbtsarmy', 'gettyimages', 'pinterest', 'x', 'wallpapers', 'wikimedia', 'reddit:bangtan', 'reddit:bts7'];
  const dynamicSources = Array.from(bySource.keys()).filter((source) => !preferredOrder.includes(source));
  const sourceOrder = [...preferredOrder.filter((source) => bySource.has(source)), ...dynamicSources];

  const selected: FeedImage[] = [];
  let cursor = 0;

  while (selected.length < targetSize) {
    let pickedInRound = false;

    for (let i = 0; i < sourceOrder.length; i += 1) {
      const source = sourceOrder[(cursor + i) % sourceOrder.length];
      const queue = bySource.get(source);
      if (!queue || queue.length === 0) continue;

      const next = queue.shift();
      if (!next) continue;
      selected.push(next);
      pickedInRound = true;

      if (selected.length >= targetSize) break;
    }

    cursor += 1;
    if (!pickedInRound) break;
  }

  return selected;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

function cleanExpiredState(now: number) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) cache.delete(key);
  }

  for (const [url, expiresAt] of recentlyServed.entries()) {
    if (expiresAt <= now) recentlyServed.delete(url);
  }
}

function stripTags(input: string): string {
  return sanitizeText(decodeHtmlEntities(input.replace(/<[^>]*>/g, ' ')));
}

function extractImageUrlsFromHtml(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();

  const push = (candidate: string) => {
    const normalized = normalizeImageUrl(candidate, pageUrl);
    if (normalized) urls.add(normalized);
  };

  const patterns = [
    /<img[^>]+src="([^"]+)"/gi,
    /<img[^>]+data-src="([^"]+)"/gi,
    /<img[^>]+srcset="([^"]+)"/gi,
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi,
    /(https?:\\\/\\\/(?:[^"'\s>])+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s>]*)?)/gi,
    /(https?:\/\/(?:[^"'\s>])+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s>]*)?)/gi,
    /(https?:\/\/(?:[^"'\s>])+pbs\.twimg\.com\/(?:[^"'\s>])+)/gi,
    /(https?:\/\/(?:[^"'\s>])+i\.pinimg\.com\/(?:[^"'\s>])+)/gi,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(html);
    while (match) {
      const raw = match[1] ?? '';
      if (raw.includes(',')) {
        for (const part of raw.split(',')) {
          const piece = part.trim().split(' ')[0] ?? '';
          if (piece) push(piece);
        }
      } else {
        push(raw);
      }
      match = pattern.exec(html);
    }
  }

  return Array.from(urls);
}

function extractHrefLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const pattern = /<a[^>]+href="([^"]+)"/gi;
  let match = pattern.exec(html);
  while (match) {
    const href = decodeHtmlEntities(match[1] ?? '').trim();
    const absolute = toAbsoluteUrl(href, baseUrl);
    if (absolute && absolute.startsWith('http')) links.add(absolute);
    match = pattern.exec(html);
  }

  return Array.from(links);
}

function toFeedImages(urls: string[], source: string, titleHint: string, member?: string): FeedImage[] {
  return urls.map((url, index) => {
    const title = sanitizeText(titleHint || 'BTS image');
    const detected = detectMember(title, [source, url]);
    return {
      id: `${source}-${hashId(`${url}-${index}`)}`,
      type: 'image' as const,
      title,
      url,
      source,
      member: detected ?? null,
      tags: ['bts', source, 'scraped'],
    };
  });
}

async function fetchGettyImages(page: number, member?: string): Promise<FeedImage[]> {
  const pages = [page * 3 + 1, page * 3 + 2, page * 3 + 3];
  const all: FeedImage[] = [];

  for (const pageIndex of pages) {
    const url = `${REQUESTED_SOURCES.gettyBase}?page=${pageIndex}`;
    const html = await fetchText(url);
    if (!html) continue;

    const urls = extractImageUrlsFromHtml(html, url);
    all.push(...toFeedImages(urls, 'gettyimages', `BTS kpop idol Getty page ${pageIndex}`, member));
  }

  return all;
}

async function fetchUsbtsArmyImages(page: number, member?: string): Promise<FeedImage[]> {
  const listPages = [page * 2 + 1, page * 2 + 2];
  const all: FeedImage[] = [];

  for (const listPage of listPages) {
    const listingUrl = `${REQUESTED_SOURCES.usbtsPhotos}?page=${listPage}`;
    const listingHtml = await fetchText(listingUrl);
    if (!listingHtml) continue;

    const cardLinks = extractHrefLinks(listingHtml, listingUrl)
      .filter((link) => link.startsWith('https://www.usbtsarmy.com/') && !link.includes('/photos'))
      .slice(0, 24);

    const detailPages = await Promise.all(cardLinks.map((link) => fetchText(link)));
    detailPages.forEach((detailHtml, index) => {
      if (!detailHtml) return;
      const pageUrl = cardLinks[index] ?? listingUrl;
      const urls = extractImageUrlsFromHtml(detailHtml, pageUrl);
      all.push(...toFeedImages(urls, 'usbtsarmy', `BTS kpop idol USBTSARMY card ${index + 1}`, member));
    });
  }

  return all;
}

async function fetchPinterestImages(member?: string): Promise<FeedImage[]> {
  const pageUrl = REQUESTED_SOURCES.pinterestIdeas;
  const html = await fetchText(pageUrl);
  if (!html) return [];
  const urls = extractImageUrlsFromHtml(html, pageUrl);
  return toFeedImages(urls, 'pinterest', 'BTS kpop idol Pinterest ideas', member);
}

async function fetchXProfileImages(member?: string): Promise<FeedImage[]> {
  const pageUrl = REQUESTED_SOURCES.xProfile;
  const html = await fetchText(pageUrl);
  if (!html) return [];
  const urls = extractImageUrlsFromHtml(html, pageUrl).filter((url) => url.includes('twimg.com') || url.includes('x.com'));
  return toFeedImages(urls, 'x', 'BTS kpop idol X profile images', member);
}

async function fetchWallpapersImages(page: number, member?: string): Promise<FeedImage[]> {
  const pages = [page * 2 + 1, page * 2 + 2];
  const all: FeedImage[] = [];

  for (const pageIndex of pages) {
    const pageUrl = `${REQUESTED_SOURCES.wallpapersBase}?page=${pageIndex}`;
    const html = await fetchText(pageUrl);
    if (!html) continue;

    const listingUrls = extractImageUrlsFromHtml(html, pageUrl);
    all.push(...toFeedImages(listingUrls, 'wallpapers', `BTS kpop idol wallpapers page ${pageIndex}`, member));

    const detailLinks = extractHrefLinks(html, pageUrl)
      .filter((link) => link.startsWith('https://wallpapers.com/') && link.includes('/bts-'))
      .slice(0, 20);

    const detailPages = await Promise.all(detailLinks.map((link) => fetchText(link)));
    detailPages.forEach((detailHtml, index) => {
      if (!detailHtml) return;
      const detailUrl = detailLinks[index] ?? pageUrl;
      const detailImgs = extractImageUrlsFromHtml(detailHtml, detailUrl);
      all.push(...toFeedImages(detailImgs, 'wallpapers', `BTS kpop idol wallpaper detail ${index + 1}`, member));
    });
  }

  return all;
}

async function fetchRequestedSourceImages(page: number, member?: string): Promise<FeedImage[]> {
  const [getty, usbts, pinterest, x, wallpapers] = await Promise.all([
    fetchGettyImages(page, member),
    fetchUsbtsArmyImages(page, member),
    fetchPinterestImages(member),
    fetchXProfileImages(member),
    fetchWallpapersImages(page, member),
  ]);

  return [...getty, ...usbts, ...pinterest, ...x, ...wallpapers];
}

function decodeDuckRedirect(rawHref: string): string {
  const absolute = toAbsoluteUrl(rawHref, 'https://duckduckgo.com');
  if (!absolute) return rawHref;

  try {
    const parsed = new URL(absolute);
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
  } catch {
    return rawHref;
  }

  return absolute;
}

async function fetchDuckDuckGoLinks(query: string, queryPage: number): Promise<SearchHit[]> {
  const offset = Math.max(0, queryPage) * 30;
  const endpoint = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${offset}`;
  const html = await fetchText(endpoint);
  if (!html) return [];

  const hits: SearchHit[] = [];
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match = re.exec(html);
  while (match) {
    const link = decodeDuckRedirect(match[1] ?? '');
    if (link.startsWith('http')) {
      hits.push({
        url: link,
        title: stripTags(match[2] ?? 'BTS result'),
        source: 'duckduckgo',
      });
    }
    match = re.exec(html);
  }

  return hits;
}

async function fetchBingLinks(query: string, queryPage: number): Promise<SearchHit[]> {
  const first = Math.max(1, queryPage * 30 + 1);
  const endpoint = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}&count=30&first=${first}`;
  const xml = await fetchText(endpoint);
  if (!xml) return [];

  const hits: SearchHit[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch = itemRe.exec(xml);
  while (itemMatch) {
    const item = itemMatch[1] ?? '';
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const url = decodeHtmlEntities((linkMatch?.[1] ?? '').trim());
    if (url.startsWith('http')) {
      hits.push({
        url,
        title: stripTags(titleMatch?.[1] ?? 'BTS result'),
        source: 'bing',
      });
    }
    itemMatch = itemRe.exec(xml);
  }

  return hits;
}

function extractImageCandidates(html: string, pageUrl: string): string[] {
  const candidates: string[] = [];

  const pushCandidate = (value: string) => {
    const normalized = normalizeImageUrl(value, pageUrl);
    if (normalized) candidates.push(normalized);
  };

  const metaPatterns = [
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi,
    /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/gi,
    /"display_url":"([^"]+)"/gi,
    /"thumbnailUrl":"([^"]+)"/gi,
    /(https?:\\\/\\\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s>]*)?)/gi,
    /(https?:\/\/[^"'\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s>]*)?)/gi,
  ];

  for (const pattern of metaPatterns) {
    let match = pattern.exec(html);
    while (match) {
      pushCandidate(match[1] ?? '');
      match = pattern.exec(html);
    }
  }

  return Array.from(new Set(candidates));
}

async function fetchPlatformPageImages(hit: SearchHit): Promise<FeedImage[]> {
  const pageHtml = await fetchText(hit.url);
  if (!pageHtml) return [];

  const titleFromHtml = stripTags(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? hit.title);
  const combinedTitle = sanitizeText(`${titleFromHtml} ${hit.title}`);
  if (!isLikelyBts(combinedTitle, [hit.source, hit.url])) return [];

  const host = hostFromUrl(hit.url) || hit.source;
  const imageUrls = extractImageCandidates(pageHtml, hit.url).slice(0, 4);

  return imageUrls
    .map((imageUrl, index) =>
      makeFeedImage({
        id: `web-${host}-${hashId(`${hit.url}-${imageUrl}-${index}`)}`,
        type: 'image',
        title: combinedTitle || 'BTS image',
        url: imageUrl,
        source: host,
        member: detectMember(combinedTitle, [host]),
        tags: ['bts', 'web', host],
      }),
    )
    .filter((item) => isLikelyBts(item.title, item.tags));
}

async function fetchWebSocialImages(page: number, member?: string): Promise<FeedImage[]> {
  const queries = buildPlatformQueries(page, member);
  const queryPages = [page * 2, page * 2 + 1, page * 2 + 2];

  const searchResults = await Promise.all(
    queries.slice(0, 10).map(async (query) => {
      const pages = await Promise.all(
        queryPages.map(async (queryPage) => {
          const [ddg, bing] = await Promise.all([
            fetchDuckDuckGoLinks(query, queryPage),
            fetchBingLinks(query, queryPage),
          ]);

          return [...ddg, ...bing];
        }),
      );

      return pages.flat();
    }),
  );

  const dedupedHits: SearchHit[] = [];
  const seenHit = new Set<string>();

  for (const hit of searchResults.flat()) {
    const normalizedUrl = hit.url.trim();
    if (!normalizedUrl || seenHit.has(normalizedUrl)) continue;

    const social = isSocialHost(normalizedUrl);
    if (!social) continue;

    seenHit.add(normalizedUrl);
    dedupedHits.push(hit);
  }

  const prioritized = [
    ...dedupedHits.filter((hit) => isSocialHost(hit.url)),
    ...dedupedHits.filter((hit) => !isSocialHost(hit.url)),
  ].slice(0, 60);

  const imageGroups = await Promise.all(prioritized.map((hit) => fetchPlatformPageImages(hit)));
  return imageGroups.flat();
}

async function fetchWikimedia(search: string, page: number): Promise<FeedImage[]> {
  const query = new URL('https://commons.wikimedia.org/w/api.php');
  query.searchParams.set('origin', '*');
  query.searchParams.set('action', 'query');
  query.searchParams.set('generator', 'search');
  query.searchParams.set('gsrsearch', search);
  query.searchParams.set('gsrnamespace', '6');
  query.searchParams.set('gsrlimit', '24');
  query.searchParams.set('gsroffset', String(page * 12));
  query.searchParams.set('prop', 'imageinfo');
  query.searchParams.set('iiprop', 'url|size');
  query.searchParams.set('format', 'json');

  const response = await fetch(query.toString(), {
    headers: {
      'User-Agent': 'BTSDiscovery/1.0',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) return [];

  const payload = await response.json() as {
    query?: {
      pages?: Record<string, {
        title?: string;
        imageinfo?: Array<{ url?: string; width?: number; height?: number }>;
      }>;
    };
  };

  return Object.values(payload.query?.pages ?? {})
    .map((pageItem) => {
      const image = pageItem.imageinfo?.[0];
      const title = sanitizeText((pageItem.title ?? '').replace('File:', '').replaceAll('_', ' '));
      if (!image?.url || !IMAGE_EXTENSIONS.test(image.url)) return null;
      if (!isLikelyBts(title, ['wikimedia'])) return null;

      return makeFeedImage({
        id: `wikimedia-${title.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'image' as const,
        title,
        url: image.url,
        source: 'wikimedia',
        member: detectMember(title, ['wikimedia']),
        width: image.width,
        height: image.height,
        tags: ['bts', 'wikimedia'],
      });
    })
    .filter((item): item is FeedImage => item !== null);
}

async function fetchReddit(search: string): Promise<FeedImage[]> {
  const subreddits = ['bangtan', 'bts7'];
  const requests = subreddits.map(async (subreddit) => {
    const endpoint = new URL(`https://www.reddit.com/r/${subreddit}/search.json`);
    endpoint.searchParams.set('q', search);
    endpoint.searchParams.set('restrict_sr', 'on');
    endpoint.searchParams.set('sort', 'top');
    endpoint.searchParams.set('t', 'year');
    endpoint.searchParams.set('limit', '30');

    const response = await fetch(endpoint.toString(), {
      headers: {
        'User-Agent': 'BTSDiscovery/1.0',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return [] as FeedImage[];

    const payload = await response.json() as {
      data?: {
        children?: Array<{
          data: {
            id: string;
            title: string;
            url: string;
            preview?: { images?: Array<{ source?: { url?: string; width?: number; height?: number } }> };
          };
        }>;
      };
    };

    return (payload.data?.children ?? [])
      .map(({ data }) => {
        const preview = data.preview?.images?.[0]?.source;
        const rawUrl = (preview?.url ?? data.url).replaceAll('&amp;', '&');
        const title = sanitizeText(data.title ?? 'BTS');
        if (!rawUrl || (!IMAGE_EXTENSIONS.test(rawUrl) && !rawUrl.includes('redd.it'))) return null;
        if (!isLikelyBts(title, [subreddit])) return null;

        return makeFeedImage({
          id: `reddit-${subreddit}-${data.id}`,
          type: 'image' as const,
          title,
          url: rawUrl,
          source: `reddit:${subreddit}`,
          member: detectMember(title, [subreddit]),
          width: preview?.width,
          height: preview?.height,
          tags: ['bts', 'reddit', subreddit],
        });
      })
      .filter((item): item is FeedImage => item !== null);
  });

  const settled = await Promise.all(requests);
  return settled.flat();
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function fetchBtsImages(page: number, size: number, member?: string): Promise<FeedImage[]> {
  const now = Date.now();
  cleanExpiredState(now);

  const cacheKey = `${page}:${size}:${member ?? 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  const searchTerms = chooseSearchTerms(page, member);
  const probePages = [page, page + 1, page + 2];
  const probeResults = await Promise.all(
    probePages.map(async (queryPage) => {
      const [requestedSources, webSocial, supplemental] = await Promise.all([
        fetchRequestedSourceImages(queryPage, member),
        fetchWebSocialImages(queryPage, member),
        Promise.all(searchTerms.flatMap((search) => [fetchWikimedia(search, queryPage), fetchReddit(search)])),
      ]);

      return [...requestedSources, ...webSocial, ...supplemental.flat()];
    }),
  );

  const pooled = probeResults.flat();

  const shuffled = shuffle(pooled);
  const seen = new Set<string>();

  const fresh: FeedImage[] = [];
  const reusable: FeedImage[] = [];

  for (const item of shuffled) {
    if (seen.has(item.url)) continue;
    if (member && item.member !== member) continue;
    if (!isLikelyBts(item.title, item.tags)) continue;
    seen.add(item.url);

    if (recentlyServed.has(item.url)) reusable.push(item);
    else fresh.push(item);
  }

  const targetSize = Math.max(size, 24);
  const rankedFresh = [...fresh].sort((a, b) => relevanceScore(b) - relevanceScore(a));
  const rankedReusable = [...reusable].sort((a, b) => relevanceScore(b) - relevanceScore(a));

  const prioritized = rankedFresh.filter((item) => relevanceScore(item) >= 4);
  const backlog = [...rankedFresh.filter((item) => relevanceScore(item) < 4), ...rankedReusable];
  const items = pickDiverseBySource([...prioritized, ...backlog], targetSize);

  const expiresAt = Date.now() + URL_COOLDOWN_MS;
  for (const item of items) {
    recentlyServed.set(item.url, expiresAt);
  }

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    items,
  });

  return items;
}
