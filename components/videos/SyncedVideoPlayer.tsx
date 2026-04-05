'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { videoSyncBus } from '@/lib/Videosyncbus';

type Props = {
  src: string;
  title: string;
  eyebrow?: string;
  posterSrc?: string;
  className?: string;
};

/**
 * Builds an enriched YouTube embed URL with:
 *  - enablejsapi=1  → allows postMessage commands/events
 *  - autoplay=1     → starts playing immediately after poster click
 *  - modestbranding=1, rel=0 → cleaner embed
 */
function enrichSrc(raw: string, autoplay: boolean): string {
  try {
    const url = new URL(raw);
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('autoplay', autoplay ? '1' : '0');
    url.searchParams.set('modestbranding', '1');
    url.searchParams.set('rel', '0');
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Sends a command to a YouTube embedded iframe via postMessage.
 * Works because enablejsapi=1 is set in the embed URL.
 */
function sendYouTubeCommand(
  iframe: HTMLIFrameElement,
  func: 'mute' | 'unMute' | 'pauseVideo' | 'playVideo',
  args: unknown[] = [],
) {
  iframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    '*',
  );
}

export default function SyncedVideoPlayer({ src, title, eyebrow, posterSrc, className = '' }: Props) {
  // Stable unique ID for this player instance
  const rawId = useId();
  const playerId = rawId.replace(/:/g, '-');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [active, setActive] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const enrichedSrc = useMemo(() => enrichSrc(src, true), [src]);

  // ── Receive YouTube state change events ──────────────────────────────────
  // YouTube sends postMessage events from the iframe when enablejsapi=1.
  // State 1 = playing. We compare event.source to identify our own iframe.
  useEffect(() => {
    if (!active) return;

    const handleMessage = (event: MessageEvent) => {
      // Only process messages from OUR iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data?.event === 'onStateChange' && data?.info === 1) {
          // This player just started playing → notify siblings to mute
          videoSyncBus.notifyPlaying(playerId);
        }
      } catch {
        // Ignore non-JSON postMessages from other sources
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [active, playerId]);

  // ── Mute this player when a sibling starts ───────────────────────────────
  useEffect(() => {
    if (!active) return;

    return videoSyncBus.subscribe((activeId) => {
      if (activeId !== playerId && iframeRef.current) {
        sendYouTubeCommand(iframeRef.current, 'mute');
      }
    });
  }, [active, playerId]);

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border border-(--border) bg-(--surface-strong) shadow-(--shadow-soft) ${className}`}>
      {/* Video area */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {/* ── Poster (shown before activation) ── */}
        <AnimatePresence>
          {!active && (
            <motion.button
              key="poster"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center focus-visible:outline-none"
              onClick={() => setActive(true)}
              aria-label={`Reproducir: ${title}`}
            >
              {/* Thumbnail */}
              {posterSrc && !posterError ? (
                <img
                  src={posterSrc}
                  alt={title}
                  width={1280}
                  height={720}
                  onError={() => setPosterError(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-purple-950/60 to-black" />
              )}

              {/* Scrim */}
              <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/15" />

              {/* Play button */}
              <motion.div
                whileHover={{ scale: 1.14 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-[0_0_32px_rgba(220,38,38,0.55)]"
              >
                <svg viewBox="0 0 24 24" fill="white" className="h-7 w-7 translate-x-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </motion.div>

              {/* YouTube wordmark hint */}
              <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-red-500">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
                Mirar en YouTube
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Active iframe ── */}
        {active && (
          <motion.iframe
            ref={iframeRef}
            src={enrichedSrc}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>

      {/* ── Metadata ── */}
      {(eyebrow || title) && (
        <div className="flex min-w-0 flex-col gap-0.5 px-4 py-3">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--muted)">
              {eyebrow}
            </p>
          )}
          {title && (
            <h3 className="truncate text-sm font-bold text-(--text)">{title}</h3>
          )}
        </div>
      )}
    </div>
  );
}