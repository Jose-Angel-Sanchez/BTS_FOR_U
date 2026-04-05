'use client';

import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import SyncedVideoPlayer from '@/components/videos/SyncedVideoPlayer';
import { mockFeedData } from '@/lib/mockData';

const DiagonalImageGrid = dynamic(() => import('@/components/videos/DiagonalimageGrid'), {
  ssr: false,
  loading: () => null,
});

// ── Featured videos (always shown prominently) ───────────────────────────────
const FEATURED = [
  {
    id: 'featured-fya',
    title: 'Reproduccion destacada',
    eyebrow: 'Video',
    videoId: 'QWDayFgPDjQ',
  },
  {
    id: 'playlist-army-radio',
    title: 'Lista BTS en reproduccion continua',
    eyebrow: 'Playlist',
    videoId: null, // playlist embed — special src below
    src: 'https://www.youtube-nocookie.com/embed/videoseries?list=RDEMI0V0e34vA6znf4KLMCIbbQ',
    posterSrc: 'https://i.ytimg.com/vi/QWDayFgPDjQ/maxresdefault.jpg',
  },
];

// ── Extended catalog (from mockFeedData + extra well-known BTS IDs) ──────────
const CATALOG_VIDEO_IDS = [
  'gdZLi9oWNZg', // Dynamite
  'WMweEpGlu_U', // Butter
  'XsX3ATc3FbA', // Boy With Luv
  'pBuZEGYXA6E', // IDOL
  'CuklIb9d3fI', // Permission to Dance
  'kXpOEzNZ8hQ', // ON
  '7C2z4GqqS5E', // Fake Love
  'xEeFrLSkMm8', // Spring Day
  'ALj5MKjy2BU', // FIRE
  'BVwAVbKYYeM', // DOPE
];

// Merge mockFeedData entries (which may have richer title/thumbnail) with fallback list
const catalogVideos = (() => {
  const fromMock = mockFeedData.filter((item) =>
    CATALOG_VIDEO_IDS.includes(item.videoId ?? ''),
  );
  const fromMockIds = new Set(fromMock.map((v) => v.videoId));

  const fromIds = CATALOG_VIDEO_IDS.filter((id) => !fromMockIds.has(id)).map((id) => ({
    id,
    videoId: id,
    title: id, // title will be overridden by poster if thumbnail loads
    imageUrl: undefined,
  }));

  return [...fromMock, ...fromIds];
})();

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
} satisfies Variants;

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -5, scale: 1.018, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
} satisfies Variants;

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTERS = ['Todos', 'MVs', 'Playlists'] as const;
type Filter = (typeof FILTERS)[number];

export default function VideosPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const [activeFilter, setActiveFilter] = useState<Filter>('Todos');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileCatalogVisible, setMobileCatalogVisible] = useState(false);
  const [mobileCatalogCount, setMobileCatalogCount] = useState(4);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateMobile();
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);

  const visibleCatalogVideos = useMemo(() => {
    if (!isMobile) return catalogVideos;
    if (!mobileCatalogVisible) return [];
    return catalogVideos.slice(0, mobileCatalogCount);
  }, [isMobile, mobileCatalogCount, mobileCatalogVisible]);

  return (
    <div className="relative min-h-screen mt-10">

      {/* ── Sticky background layer ───────────────────────────────────────── */}
      <section
        className="sticky top-0 h-0 w-full overflow-visible"
        style={isMobile ? { contentVisibility: 'auto', containIntrinsicSize: '100vh' } : undefined}
      >
        {isMobile ? (
          <div
            className="mobile-particle-backdrop pointer-events-none absolute inset-x-0 top-0 h-screen overflow-hidden"
            aria-hidden="true"
          >
            <div className="mobile-particle-layer mobile-particle-layer-1" />
            <div className="mobile-particle-layer mobile-particle-layer-2" />
            <div className="mobile-particle-layer mobile-particle-layer-3" />
            <div className="mobile-particle-glow" />
          </div>
        ) : (
          <DiagonalImageGrid />
        )}
      </section>

      {/* ── HERO title content (no full-screen spacer) ───────────────────── */}
      <section
        ref={heroRef}
        className="relative z-10 w-full px-6 pb-6 pt-4"
        style={isMobile ? { contentVisibility: 'auto', containIntrinsicSize: '12rem' } : undefined}
      >
        <motion.div style={isMobile ? { opacity: heroOpacity } : { y: heroY, opacity: heroOpacity }} className="page-shell">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.55 }}
            className="text-xs font-semibold uppercase tracking-[0.36em] text-(--muted)"
          >
            Videos
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 text-5xl font-black tracking-[-0.05em] sm:text-6xl lg:text-7xl"
          >
            Videoteca de BTS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mt-3 text-sm text-(--muted) sm:text-base"
          >
            {catalogVideos.length + FEATURED.length} videos · Actualizado
          </motion.p>
        </motion.div>
      </section>

      {/* ── FEATURED — two large embeds ──────────────────────────────────── */}
      <section
        className="page-shell relative z-10 px-4 py-10 sm:px-6"
        style={isMobile ? { contentVisibility: 'auto', containIntrinsicSize: '60rem' } : undefined}
      >
        <motion.p
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-(--muted)"
        >
          Destacados
        </motion.p>

        <div className="grid gap-5 xl:grid-cols-2">
          {FEATURED.map((video, i) => {
            const src = video.src ??
              `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=0&modestbranding=1&rel=0`;
            const poster = video.posterSrc ??
              (video.videoId
                ? `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`
                : undefined);

            return (
              <motion.div
                key={video.id}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                whileHover={isMobile ? undefined : 'hover'}
                animate="rest"
              >
                <motion.div variants={cardHover}>
                  <SyncedVideoPlayer
                    src={src}
                    title={video.title}
                    eyebrow={video.eyebrow}
                    posterSrc={poster}
                    className="shadow-(--shadow-soft)"
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── CATALOG — extended grid with filter tabs ─────────────────────── */}
      <section
        className="page-shell relative z-10 px-4 pb-20 sm:px-6"
        style={isMobile ? { contentVisibility: 'auto', containIntrinsicSize: '80rem' } : undefined}
      >
        {isMobile && !mobileCatalogVisible ? (
          <div className="mb-6 rounded-3xl border border-(--border) bg-(--surface-soft) p-5 text-center shadow-(--shadow-soft)">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--muted)">Catálogo</p>
            <h2 className="mt-2 text-xl font-black">Carga ligera en móvil</h2>
            <p className="mt-2 text-sm text-(--muted)">Mostramos la lista cuando la solicites para que la vista vaya más fluida.</p>
            <button
              onClick={() => setMobileCatalogVisible(true)}
              className="mt-4 rounded-full bg-(--accent) px-5 py-2 text-sm font-semibold text-white"
            >
              Mostrar catálogo
            </button>
          </div>
        ) : null}

        {(!isMobile || mobileCatalogVisible) ? (
          <>
        {/* Section header + filter tabs */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--muted)">
              Catálogo
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Videos que se pueden reproducir aquí
            </h2>
          </motion.div>

          {/* Filter pills */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex gap-2"
          >
            {FILTERS.map((f) => (
              <motion.button
                key={f}
                onClick={() => setActiveFilter(f)}
                whileTap={{ scale: 0.93 }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors
                  ${activeFilter === f
                    ? 'bg-(--accent) text-white shadow-lg shadow-(--background)/30'
                    : 'bg-(--surface-soft) text-(--muted) hover:text-(--text)'
                  }`}
              >
                {f}
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Video grid — 2 cols mobile, 3 tablet, 4 desktop */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {visibleCatalogVideos.map((video, i) => {
              if (!video.videoId) return null;

              const src = `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=0&modestbranding=1&rel=0`;
              const poster = (video as { imageUrl?: string }).imageUrl ??
                `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`;

              return (
                <motion.div
                  key={video.id ?? video.videoId}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-40px' }}
                  variants={fadeUp}
                  whileHover={isMobile ? undefined : 'hover'}
                  animate="rest"
                >
                  <motion.div variants={cardHover} className="h-full">
                    <SyncedVideoPlayer
                      src={src}
                      title={video.title}
                      eyebrow="Oficial"
                      posterSrc={poster}
                      className="h-full"
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {isMobile && mobileCatalogVisible && mobileCatalogCount < catalogVideos.length ? (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setMobileCatalogCount((current) => Math.min(current + 4, catalogVideos.length))}
              className="rounded-full border border-(--border) bg-(--surface-soft) px-5 py-2 text-sm font-semibold text-foreground"
            >
              Cargar más videos
            </button>
          </div>
        ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}