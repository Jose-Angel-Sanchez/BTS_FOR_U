'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useInfiniteBtsFeed } from '@/hooks/useInfiniteBtsFeed';
import { getBlacklist } from '@/store/personalization';
import type { FeedImage } from '@/types/feed';

type GridImage = Pick<FeedImage, 'id' | 'url' | 'title'>;

// ── Row configuration ─────────────────────────────────────────────────────────
const TILE_W = 210;  // px
const TILE_H = 132;  // px
const GAP = 10;      // px between tiles
const PER_ROW = 12;  // tiles per copy (doubled for seamless loop)

const STRIP_W = (TILE_W + GAP) * PER_ROW; // width of one copy

// Each row: which image subset, direction, and speed (seconds for one full loop)
const ROW_CONFIGS = [
  { startAt: 0,  reverse: false, duration: 48 },
  { startAt: 4,  reverse: true,  duration: 38 },
  { startAt: 8,  reverse: false, duration: 54 },
  { startAt: 2,  reverse: true,  duration: 42 },
  { startAt: 6,  reverse: false, duration: 50 },
  { startAt: 10, reverse: true,  duration: 40 },
  { startAt: 3,  reverse: false, duration: 46 },
  { startAt: 7,  reverse: true,  duration: 36 },
];

function buildRow(images: GridImage[], startAt: number): GridImage[] {
  const row: GridImage[] = [];
  if (images.length === 0) return row;
  for (let i = 0; i < PER_ROW; i++) {
    row.push(images[(startAt + i) % images.length]);
  }
  return row;
}

// ── Theme-aware overlay colours ───────────────────────────────────────────────
const DARK_OVERLAY = 'rgba(6, 3, 18, 0.72)';
const LIGHT_OVERLAY = 'rgba(245, 240, 255, 0.76)';

export default function DiagonalImageGrid() {
  const [overlayColor, setOverlayColor] = useState(DARK_OVERLAY);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const [blacklistedIds, setBlacklistedIds] = useState<Record<string, true>>({});
  const [blacklistedUrls, setBlacklistedUrls] = useState<Record<string, true>>({});
  const { items, hasMore, isLoading, loadNext } = useInfiniteBtsFeed({ batchSize: 36 });

  const pool = useMemo(() => {
    const images = items.filter((item): item is FeedImage => item.type === 'image');
    const uniqueByUrl = new Set<string>();
    const cleaned: GridImage[] = [];

    images.forEach((image) => {
      if (blacklistedIds[image.id] || blacklistedUrls[image.url] || brokenUrls[image.url]) return;
      if (uniqueByUrl.has(image.url)) return;
      uniqueByUrl.add(image.url);
      cleaned.push({ id: image.id, url: image.url, title: image.title });
    });

    return cleaned;
  }, [blacklistedIds, blacklistedUrls, brokenUrls, items]);

  useEffect(() => {
    const blacklist = getBlacklist();
    setBlacklistedIds(Object.fromEntries(blacklist.ids.map((id) => [id, true])));
    setBlacklistedUrls(Object.fromEntries(blacklist.urls.map((url) => [url, true])));

    const onStorage = (event: StorageEvent) => {
      if (event.key && !event.key.includes('blacklist')) return;
      const next = getBlacklist();
      setBlacklistedIds(Object.fromEntries(next.ids.map((id) => [id, true])));
      setBlacklistedUrls(Object.fromEntries(next.urls.map((url) => [url, true])));
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (isLoading || !hasMore) return;
    if (pool.length >= PER_ROW * 2) return;
    void loadNext();
  }, [hasMore, isLoading, loadNext, pool.length]);

  // Sync with the app's data-theme attribute (same mechanism as ThreeBackground)
  useEffect(() => {
    const update = () => {
      const isLight = document.documentElement.dataset.theme === 'light';
      setOverlayColor(isLight ? LIGHT_OVERLAY : DARK_OVERLAY);
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-screen overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Rotated grid container ──────────────────────────────────────────
           Rotate -12° and scale up to fill corners. The negative margin
           on inset ensures the rotated content covers the full viewport.   */}
      <div
        className="absolute"
        style={{
          inset: '-10%',
          transform: 'rotate(-12deg)',
          display: 'flex',
          flexDirection: 'column',
          gap: GAP,
          margin: '0 auto',
          width: '120vw',
          height: '120vh',
        }}
      >
        {ROW_CONFIGS.map((cfg, rowIdx) => {
          const images = buildRow(pool, cfg.startAt);
          // Double images for seamless loop
          const doubled = [...images, ...images];

          // Reverse direction: start at -STRIP_W, animate to 0
          // Forward direction: start at 0, animate to -STRIP_W
          const fromX = cfg.reverse ? -STRIP_W : 0;
          const toX   = cfg.reverse ? 0 : -STRIP_W;

          return (
            <div
              key={rowIdx}
              className="relative shrink-0 overflow-hidden"
              style={{ height: TILE_H }}
            >
              <motion.div
                className="absolute flex"
                style={{ gap: GAP, width: STRIP_W * 2, x: fromX }}
                animate={{ x: toX }}
                transition={{
                  duration: cfg.duration,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'linear',
                }}
              >
                {doubled.map((thumb, tileIdx) => (
                  <div
                    key={`${rowIdx}-${tileIdx}`}
                    className="relative shrink-0 overflow-hidden rounded-lg"
                    style={{ width: TILE_W, height: TILE_H }}
                  >
                    {thumb ? (
                      <img
                        src={thumb.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                          setBrokenUrls((prev) => ({ ...prev, [thumb.url]: true }));
                        }}
                        className="h-full w-full object-cover opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="h-full w-full bg-linear-to-br from-black/40 via-black/20 to-black/40" />
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ── Theme overlay — tints and softens the grid ─────────────────── */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: overlayColor }}
      />

      {/* ── Edge vignettes (top/bottom fade to true bg) ────────────────── */}
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-(--background)/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-(--background)/90 to-transparent" />
    </div>
  );
}