'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedItem } from '@/types/feed';
import { preferenceWeight } from '@/store/personalization';

interface IdleRequestOptions {
  timeout?: number;
}

interface IdleRequestCallback {
  (deadline: { timeRemaining: () => number; didTimeout: boolean }): void;
}

interface UseFeedOptions {
  batchSize?: number;
  member?: string;
}

const FEED_CACHE_KEY = 'bts.feed.images.cache.v2';
const PREFETCH_PARALLEL_PAGES = 2;
const PREFETCH_MIN_BUFFER_MULTIPLIER = 3;
const CACHE_HYDRATE_LIMIT = 120;

interface FeedCacheBucket {
  items: FeedItem[];
  page: number;
  savedAt: string;
}

type FeedCacheStore = Record<string, FeedCacheBucket>;

function getCacheKey(member?: string) {
  return member ? `member:${member}` : 'member:all';
}

function readFeedCache(member?: string): FeedCacheBucket | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedCacheStore;
    const bucket = parsed[getCacheKey(member)];
    if (!bucket || !Array.isArray(bucket.items)) return null;
    return {
      ...bucket,
      items: bucket.items.slice(0, CACHE_HYDRATE_LIMIT),
    };
  } catch {
    return null;
  }
}

function writeFeedCache(member: string | undefined, next: FeedCacheBucket) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FeedCacheStore) : {};
    parsed[getCacheKey(member)] = {
      items: next.items.slice(0, 300),
      page: next.page,
      savedAt: next.savedAt,
    };
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore cache write failures.
  }
}

export function useInfiniteBtsFeed(options: UseFeedOptions = {}) {
  const { batchSize = 24, member } = options;
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnCount, setColumnCount] = useState(4);
  const didInitialLoad = useRef(false);
  const seen = useRef<Set<string>>(new Set());
  const emptyPageStreak = useRef(0);
  const inflight = useRef(false);

  useEffect(() => {
    didInitialLoad.current = false;
    seen.current.clear();
    emptyPageStreak.current = 0;
    const cached = readFeedCache(member);
    if (cached && cached.items.length > 0) {
      const deduped = cached.items.reduce<FeedItem[]>((acc, item) => {
        if (seen.current.has(item.id)) return acc;
        seen.current.add(item.id);
        acc.push(item);
        return acc;
      }, []);
      setItems(deduped);
      setPage(Math.max(cached.page, 0));
    } else {
      setItems([]);
      setPage(0);
    }
    setHasMore(true);
    setError(null);
  }, [member, batchSize]);

  const loadBurst = useCallback(async (startPage: number, burstCount = 1) => {
    if (inflight.current || !hasMore) return;
    inflight.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const collectedResponses: Array<{ incoming: FeedItem[]; nextPage: number }> = [];
      let cursor = startPage;

      for (let burstIndex = 0; burstIndex < burstCount; burstIndex += 1) {
        const pagesToFetch = Array.from({ length: PREFETCH_PARALLEL_PAGES }, (_, index) => cursor + index);

        const responses = await Promise.all(
          pagesToFetch.map(async (currentPage) => {
            const params = new URLSearchParams({
              page: String(currentPage),
              size: String(batchSize),
            });

            if (member) params.set('member', member);

            const res = await fetch(`/api/bts-images?${params.toString()}`);
            if (!res.ok) throw new Error('Unable to load feed');

            const data = (await res.json()) as {
              items?: FeedItem[];
              images?: Array<{ id?: string; title?: string; url: string }>;
              nextPage?: number;
            };

            const incoming: FeedItem[] = Array.isArray(data.items)
              ? data.items
              : (data.images ?? []).map((image, index) => ({
                  id: image.id ?? `img-${currentPage}-${index}`,
                  type: 'image' as const,
                  title: image.title ?? 'BTS image',
                  url: image.url,
                  source: 'bts-images',
                  member: member ?? null,
                  tags: ['bts', member ?? 'all'],
                }));

            return {
              incoming,
              nextPage: data.nextPage ?? currentPage + 1,
            };
          }),
        );

        collectedResponses.push(...responses);
        cursor = Math.max(cursor + PREFETCH_PARALLEL_PAGES, Math.max(...responses.map((result) => result.nextPage), cursor + 1));
      }

      const incoming = collectedResponses.flatMap((result) => result.incoming);

      const unique = incoming.reduce<FeedItem[]>((acc, item) => {
        const uniqueId = `${member || 'all'}-${item.id}`;
        if (seen.current.has(uniqueId)) return acc;

        seen.current.add(uniqueId);
        acc.push({ ...item, id: uniqueId });
        return acc;
      }, []);

      const ranked = [...unique].sort((a, b) => preferenceWeight(b.tags) - preferenceWeight(a.tags));
      const nextPage = Math.max(...collectedResponses.map((result) => result.nextPage), cursor);
      setItems((prev) => {
        const merged = [...prev, ...ranked];
        writeFeedCache(member, {
          items: merged,
          page: nextPage,
          savedAt: new Date().toISOString(),
        });
        return merged;
      });
      setPage(nextPage);

      if (unique.length === 0) {
        emptyPageStreak.current += 1;
      } else {
        emptyPageStreak.current = 0;
      }

      setHasMore(emptyPageStreak.current < 10);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unknown feed error';
      setError(message);
    } finally {
      inflight.current = false;
      setIsLoading(false);
    }
  }, [batchSize, hasMore, member, page]);

  const loadNext = useCallback(async () => loadBurst(page, 1), [loadBurst, page]);

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    const cached = readFeedCache(member);
    if (!cached || cached.items.length === 0) {
      void loadNext();
    }
  }, [loadNext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoading || !hasMore) return;
    const minBuffer = batchSize * PREFETCH_MIN_BUFFER_MULTIPLIER;
    if (items.length >= minBuffer) return;

    if ('requestIdleCallback' in window) {
      const idleId = (window.requestIdleCallback as (callback: IdleRequestCallback, options?: IdleRequestOptions) => number)(
        () => {
          void loadBurst(page, 1);
        },
        { timeout: 600 },
      );
      return () => {
        if ('cancelIdleCallback' in window) {
          (window.cancelIdleCallback as (id: number) => void)(idleId);
        }
      };
    }

    const timer = window.setTimeout(() => {
      void loadBurst(page, 1);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [batchSize, hasMore, isLoading, items.length, loadBurst, page]);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) setColumnCount(2);
      else setColumnCount(4);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const masonryColumns = useMemo(() => {
    const grouped: FeedItem[][] = Array.from({ length: columnCount }, () => []);
    items.forEach((item, index) => grouped[index % columnCount].push(item));
    return grouped;
  }, [columnCount, items]);

  return { items, masonryColumns, isLoading, error, hasMore, loadNext };
}
