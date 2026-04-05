'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Ban, Copy, Download, Eye, QrCode, Share2 } from 'lucide-react';
import { useInfiniteBtsFeed } from '@/hooks/useInfiniteBtsFeed';
import type { FeedItem, FeedKind } from '@/types/feed';
import { addToBlacklist, getBlacklist, pushInteraction } from '@/store/personalization';
import ImageModal from '@/components/ui/ImageModal';
import VideoModal from '@/components/ui/VideoModal';
import { mockFeedData } from '@/lib/mockData';

interface MasonryFeedProps {
  filterType?: FeedKind;
  member?: string;
}

async function downloadImage(url: string) {
  const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `bts-${Date.now()}.jpg`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

export default function MasonryFeed({ filterType, member }: MasonryFeedProps) {
  const { items, masonryColumns, isLoading, hasMore, loadNext, error } = useInfiniteBtsFeed({
    batchSize: 24,
    member,
  });

  const [activeImage, setActiveImage] = useState<FeedItem | null>(null);
  const [imageModalTab, setImageModalTab] = useState<'view' | 'qr'>('view');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, true>>({});
  const [blacklistedIds, setBlacklistedIds] = useState<Record<string, true>>({});
  const [blacklistedUrls, setBlacklistedUrls] = useState<Record<string, true>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadLockRef = useRef(false);

  useEffect(() => {
    const blacklist = getBlacklist();
    setBlacklistedIds(Object.fromEntries(blacklist.ids.map((id) => [id, true])));
    setBlacklistedUrls(Object.fromEntries(blacklist.urls.map((url) => [url, true])));
  }, []);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateMobile();
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);

  const filtered = useMemo(() => {
    if (filterType === 'video') {
      return mockFeedData
        .filter((item) => item.type === 'video' && item.videoId)
        .map((item) => ({
          id: item.id,
          type: 'video' as const,
          title: item.title,
          url: item.url,
          source: 'youtube',
          member: null,
          videoId: item.videoId!,
          tags: ['bts', 'video'],
        }));
    }

    if (!filterType) return items;
    return items.filter((item) => item.type === filterType);
  }, [filterType, items]);

  const cleanedItems = useMemo(() => {
    return filtered.filter((item) => {
      if (blacklistedIds[item.id] || blacklistedUrls[item.url]) return false;
      if (item.type === 'video') return true;
      return !brokenImageIds[item.id];
    });
  }, [blacklistedIds, blacklistedUrls, brokenImageIds, filtered]);

  const visibleByColumn = useMemo(() => {
    if (filterType === 'video') {
      const columns = Array.from({ length: 3 }, () => [] as FeedItem[]);
      cleanedItems.forEach((item, index) => {
        columns[index % columns.length].push(item);
      });
      return columns;
    }

    const columns = Array.from({ length: Math.max(masonryColumns.length, 1) }, () => [] as FeedItem[]);
    const heights = Array.from({ length: Math.max(masonryColumns.length, 1) }, () => 0);

    cleanedItems.forEach((item) => {
      let shortest = 0;
      for (let i = 1; i < heights.length; i += 1) {
        if (heights[i] < heights[shortest]) shortest = i;
      }

      columns[shortest].push(item);
      const estimate = item.type === 'video' ? 0.7 : (item.height && item.width ? item.height / item.width : 1.1);
      heights[shortest] += Math.max(0.62, Math.min(1.85, estimate));
    });

    return columns;
  }, [cleanedItems, filterType, masonryColumns.length]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setShowScrollTop(y > 520);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (!entry.isIntersecting) {
          loadLockRef.current = false;
          return;
        }

        if (hasMore && !loadLockRef.current) {
          loadLockRef.current = true;
          void loadNext();
        }
      },
      { rootMargin: '2400px 0px 2600px 0px', threshold: 0 },
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadNext]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function onCopy(url: string, item: FeedItem) {
    await navigator.clipboard.writeText(url);
    pushInteraction({ itemId: item.id, type: 'copy', tags: item.tags, member: item.member, at: new Date().toISOString() });
    notify('Enlace copiado');
  }

  async function onShare(url: string, item: FeedItem) {
    if (navigator.share) {
      try {
        await navigator.share({ url, title: item.title });
      } catch {
        await navigator.clipboard.writeText(url);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }

    pushInteraction({ itemId: item.id, type: 'share', tags: item.tags, member: item.member, at: new Date().toISOString() });
    notify('Enlace compartido');
  }

  async function onDownload(url: string, item: FeedItem) {
    await downloadImage(url);
    pushInteraction({ itemId: item.id, type: 'download', tags: item.tags, member: item.member, at: new Date().toISOString() });
    notify('Imagen descargada');
  }

  function onExclude(item: FeedItem) {
    const next = addToBlacklist(item.id, item.url);
    setBlacklistedIds(Object.fromEntries(next.ids.map((id) => [id, true])));
    setBlacklistedUrls(Object.fromEntries(next.urls.map((url) => [url, true])));
    setActiveActionsId((current) => (current === item.id ? null : current));
    if (activeImage?.id === item.id) {
      setActiveImage(null);
    }
    notify('Resultado excluido');
  }

  function openImageModal(item: FeedItem, tab: 'view' | 'qr' = 'view') {
    if (item.type !== 'image') return;
    setImageModalTab(tab);
    setActiveImage(item);
    pushInteraction({ itemId: item.id, type: 'view', tags: item.tags, member: item.member, at: new Date().toISOString() });
  }

  const backToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <section className="page-shell relative w-full px-3 py-8 sm:px-5">
      <div className="soft-blur-mask soft-blur-mask-top" />
      <div className="soft-blur-mask soft-blur-mask-bottom" />

      <AnimatePresence>
        {toast && (
          <motion.p
            initial={isMobile ? false : { opacity: 0, y: -20 }}
            animate={isMobile ? undefined : { opacity: 1, y: 0 }}
            exit={isMobile ? undefined : { opacity: 0, y: -10 }}
            className="fixed left-1/2 top-20 z-120 -translate-x-1/2 rounded-2xl bg-bts-purple px-4 py-2 text-sm text-white"
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>

      <div className={`${isMobile ? '' : 'feed-3d-stage '}flex w-full items-start gap-3 sm:gap-4`}>
        {visibleByColumn.map((column, colIndex) => (
          <div key={colIndex} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
            {column.map((item, index) => (
              <motion.article
                key={`${item.id}-${index}`}
                initial={isMobile ? false : { opacity: 0, y: 12 }}
                animate={isMobile ? undefined : { opacity: 1, y: 0 }}
                whileHover={isMobile ? undefined : { y: -8, scale: 1.015, rotateY: colIndex % 2 === 0 ? -2 : 2, rotateX: 1 }}
                transition={isMobile ? undefined : { type: 'spring', stiffness: 220, damping: 22 }}
                className={`${isMobile ? '' : 'feed-3d-card '}group relative overflow-hidden rounded-3xl bg-transparent shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl`}
                style={isMobile ? undefined : { transformStyle: 'preserve-3d' }}
              >
                <button
                  onClick={() => {
                    if (item.type === 'video') {
                      setActiveVideoId(item.videoId);
                      pushInteraction({ itemId: item.id, type: 'open_video', tags: item.tags, member: item.member, at: new Date().toISOString() });
                      return;
                    }

                    setActiveActionsId((current) => (current === item.id ? null : item.id));
                  }}
                  className="w-full text-left"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    width={item.width ?? 1200}
                    height={item.height ?? 900}
                    loading="lazy"
                    className="h-auto w-full object-cover"
                    onError={() => {
                      setBrokenImageIds((prev) => ({ ...prev, [item.id]: true }));
                    }}
                  />
                </button>

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/72 to-transparent p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
                    {item.member ?? 'grupo'} · {item.source}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-white/90 sm:text-sm">{item.title}</p>
                </div>

                <div
                  className={`absolute left-2 right-2 top-2 z-20 flex flex-wrap justify-end gap-1 rounded-2xl bg-black/28 p-1.5 backdrop-blur-md transition-opacity ${
                    activeActionsId === item.id ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <button onClick={() => onExclude(item)} className="rounded-full bg-white/8 p-2 transition-colors hover:bg-red-500/80" title="Excluir este resultado"><Ban className="h-4 w-4" /></button>
                  <button onClick={() => void onCopy(item.url, item)} className="rounded-full bg-white/8 p-2 transition-colors hover:bg-bts-purple" title="Copiar enlace"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => void onShare(item.url, item)} className="rounded-full bg-white/8 p-2 transition-colors hover:bg-bts-purple" title="Compartir"><Share2 className="h-4 w-4" /></button>
                  {item.type === 'image' && (
                    <button onClick={() => openImageModal(item, 'view')} className="rounded-full bg-white/8 p-2 transition-colors hover:bg-bts-purple" title="Ver a detalle"><Eye className="h-4 w-4" /></button>
                  )}
                  {item.type === 'image' && (
                    <button onClick={() => openImageModal(item, 'qr')} className="rounded-full bg-white/8 p-2 transition-colors hover:bg-bts-purple" title="Generar QR"><QrCode className="h-4 w-4" /></button>
                  )}
                  {item.type === 'image' && (
                    <button onClick={() => void onDownload(item.url, item)} className="rounded-full bg-white/8 p-2 transition-colors hover:bg-bts-purple" title="Descargar"><Download className="h-4 w-4" /></button>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="flex h-20 items-center justify-center">
        {isLoading && <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-bts-purple" />}
        {!isLoading && !hasMore && cleanedItems.length > 0 && <p className="text-sm text-white/50">No hay mas imagenes por cargar</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={isMobile ? false : { opacity: 0, y: 22, scale: 0.92 }}
            animate={isMobile ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? undefined : { opacity: 0, y: 18, scale: 0.92 }}
            onClick={backToTop}
            className="fixed right-5 bottom-6 z-120 rounded-full bg-(--accent)/88 p-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-lg transition-transform hover:-translate-y-1"
            title="Volver al inicio"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <ImageModal
        isOpen={!!activeImage}
        imageUrl={activeImage?.type === 'image' ? activeImage.url : null}
        title={activeImage?.title}
        initialTab={imageModalTab}
        onExclude={activeImage?.type === 'image' ? () => onExclude(activeImage) : undefined}
        onClose={() => setActiveImage(null)}
      />

      <VideoModal videoId={activeVideoId} isOpen={!!activeVideoId} onClose={() => setActiveVideoId(null)} />
    </section>
  );
}
