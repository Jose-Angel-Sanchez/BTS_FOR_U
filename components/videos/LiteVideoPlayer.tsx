'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const youtubePlayers = new Set<HTMLIFrameElement>();
let youtubeListenerAttached = false;

function ensureYouTubeListener() {
  if (youtubeListenerAttached) return;
  youtubeListenerAttached = true;

  window.addEventListener('message', (event) => {
    if (typeof event.data !== 'string' || (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))) return;

    let payload: { event?: string; info?: unknown } | null = null;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (payload?.event !== 'onStateChange' || payload.info !== 1) return;

    youtubePlayers.forEach((iframe) => {
      if (iframe.contentWindow && event.source && iframe.contentWindow !== event.source) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
      }
    });
  });
}

interface LiteVideoPlayerProps {
  title: string;
  src: string;
  posterSrc?: string;
  eyebrow?: string;
}

export default function LiteVideoPlayer({ title, src, posterSrc, eyebrow }: LiteVideoPlayerProps) {
  const playerId = useId().replace(/:/g, '');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [origin, setOrigin] = useState('');
  const isPlaylist = src.includes('/embed/videoseries');

  const embedSrc = useMemo(() => {
    const params = new URLSearchParams();
    params.set('autoplay', '0');
    params.set('playsinline', '1');
    params.set('rel', '0');
    params.set('modestbranding', '1');
    params.set('enablejsapi', '1');

    if (origin && !isPlaylist) {
      params.set('origin', origin);
    }

    const joiner = src.includes('?') ? '&' : '?';
    return `${src}${joiner}${params.toString()}`;
  }, [isPlaylist, origin, src]);

  useEffect(() => {
    setOrigin(window.location.origin);
    ensureYouTubeListener();

    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.name = playerId;
    youtubePlayers.add(iframe);

    return () => {
      youtubePlayers.delete(iframe);
    };
  }, [playerId]);

  return (
    <motion.article whileHover={{ y: -4, scale: 1.006 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} className="overflow-hidden rounded-[1.6rem] bg-transparent shadow-[0_24px_76px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      </div>
      <div className="px-5 py-4">
        {eyebrow ? <p className="text-[11px] uppercase tracking-[0.28em] text-(--muted)">{eyebrow}</p> : null}
        <h3 className="mt-2 text-lg font-bold tracking-tight">{title}</h3>
      </div>
    </motion.article>
  );
}
