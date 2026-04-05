'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useInfiniteBtsFeed } from '@/hooks/useInfiniteBtsFeed';
import { getBlacklist } from '@/store/personalization';
import type { FeedImage } from '@/types/feed';

type GridImage = Pick<FeedImage, 'id' | 'url' | 'title'>;

// ── Row configuration ─────────────────────────────────────────────────────────
const DESKTOP_TILE_W = 210;  // px
const DESKTOP_TILE_H = 132;  // px
const DESKTOP_GAP = 10;      // px between tiles
const DESKTOP_PER_ROW = 12;  // tiles per copy (doubled for seamless loop)

const MOBILE_TILE_W = 146;
const MOBILE_TILE_H = 92;
const MOBILE_GAP = 8;
const MOBILE_PER_ROW = 8;

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
  for (let i = 0; i < images.length; i++) {
    row.push(images[(startAt + i) % images.length]);
  }
  return row;
}

function buildStrip(images: GridImage[], startAt: number, perRow: number): GridImage[] {
  const row: GridImage[] = [];
  if (images.length === 0) return row;
  for (let i = 0; i < perRow; i++) {
    row.push(images[(startAt + i) % images.length]);
  }
  return row;
}

// ── Theme-aware overlay colours ───────────────────────────────────────────────
const DARK_OVERLAY = 'rgba(6, 3, 18, 0.72)';
const LIGHT_OVERLAY = 'rgba(245, 240, 255, 0.76)';

export default function DiagonalImageGrid() {
  const [isMobile, setIsMobile] = useState(false);
  const [overlayColor, setOverlayColor] = useState(DARK_OVERLAY);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const [blacklistedIds, setBlacklistedIds] = useState<Record<string, true>>({});
  const [blacklistedUrls, setBlacklistedUrls] = useState<Record<string, true>>({});
  const { items, hasMore, isLoading, loadNext } = useInfiniteBtsFeed({ batchSize: 36 });

  const tileW = isMobile ? MOBILE_TILE_W : DESKTOP_TILE_W;
  const tileH = isMobile ? MOBILE_TILE_H : DESKTOP_TILE_H;
  const gap = isMobile ? MOBILE_GAP : DESKTOP_GAP;
  const perRow = isMobile ? MOBILE_PER_ROW : DESKTOP_PER_ROW;
  const stripW = (tileW + gap) * perRow;

  const visibleRows = useMemo(() => (isMobile ? ROW_CONFIGS.slice(0, 4) : ROW_CONFIGS), [isMobile]);

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
    const updateMobile = () => {
      setIsMobile(window.matchMedia('(hover: none), (pointer: coarse)').matches || window.innerWidth < 768);
    };

    updateMobile();

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
    window.addEventListener('resize', updateMobile);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('resize', updateMobile);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !hasMore) return;
    if (pool.length >= perRow * 3) return;
    void loadNext();
  }, [hasMore, isLoading, loadNext, perRow, pool.length]);

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
          inset: isMobile ? '-2% -10% -4% -2%' : '-10%',
          transform: isMobile ? 'translateX(8vw) rotate(-8deg)' : 'rotate(-12deg)',
          display: 'flex',
          flexDirection: 'column',
          gap,
          margin: '0 auto',
          width: isMobile ? '150vw' : '120vw',
          height: isMobile ? '112vh' : '120vh',
        }}
      >
        {visibleRows.map((cfg, rowIdx) => {
          const images = buildStrip(pool, cfg.startAt, perRow);
          // Double images for seamless loop
          const doubled = [...images, ...images];

          // Reverse direction: start at -STRIP_W, animate to 0
          // Forward direction: start at 0, animate to -STRIP_W
          const fromX = cfg.reverse ? -stripW : 0;
          const toX   = cfg.reverse ? 0 : -stripW;

          return (
            <div
              key={rowIdx}
              className="relative shrink-0 overflow-hidden"
              style={{ height: tileH }}
            >
              <motion.div
                className="absolute flex"
                style={{ gap, width: stripW * 2, x: fromX }}
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
                    style={{ width: tileW, height: tileH }}
                  >
                    {thumb ? (
                      <img
                        src={thumb.url}
                        alt=""
                        width={tileW}
                        height={tileH}
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