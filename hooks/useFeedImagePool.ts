'use client';

import { useEffect, useState } from 'react';

export interface FeedImageItem {
  id: string;
  title: string;
  url: string;
}

export function useFeedImagePool(size = 48) {
  const [images, setImages] = useState<FeedImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const normalize = (items: Array<{ id: string; title: string; url: string }>) =>
    items
      .filter((item) => Boolean(item?.url))
      .map((item, index) => ({
        id: item.id || `feed-${index}`,
        title: item.title || 'BTS',
        url: item.url,
      }));

  const mergeUnique = (base: FeedImageItem[], incoming: FeedImageItem[]) => {
    const seen = new Set(base.map((item) => item.id || item.url));
    const merged = [...base];

    incoming.forEach((item) => {
      const key = item.id || item.url;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    return merged;
  };

  async function loadMore() {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(nextPage), size: String(size) });
      const res = await fetch(`/api/bts-images?${params.toString()}`);
      if (!res.ok) throw new Error('No se pudo cargar mas imagenes');

      const data = (await res.json()) as {
        items?: Array<{ id: string; title: string; url: string }>;
        images?: Array<{ id: string; title: string; url: string }>;
      };

      const raw = Array.isArray(data.items) ? data.items : Array.isArray(data.images) ? data.images : [];
      const safe = normalize(raw);

      if (!safe.length) {
        setHasMore(false);
      } else {
        setImages((current) => mergeUnique(current, safe));
        setNextPage((current) => current + 1);
      }
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Error cargando mas imagenes';
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: '0', size: String(size) });
        const res = await fetch(`/api/bts-images?${params.toString()}`);
        if (!res.ok) throw new Error('No se pudo cargar el feed de imagenes');

        const data = (await res.json()) as {
          items?: Array<{ id: string; title: string; url: string }>;
          images?: Array<{ id: string; title: string; url: string }>;
        };

        const base = Array.isArray(data.items) ? data.items : Array.isArray(data.images) ? data.images : [];
        const safe = normalize(base);

        if (mounted) {
          setImages(safe);
          setHasMore(safe.length > 0);
          setNextPage(1);
        }
      } catch (unknownError) {
        const message = unknownError instanceof Error ? unknownError.message : 'Error cargando imagenes';
        if (mounted) setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void run();
    return () => {
      mounted = false;
    };
  }, [size]);

  return { images, loading, error, loadMore, hasMore, loadingMore };
}
