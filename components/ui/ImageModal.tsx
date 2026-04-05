'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, Share2, QrCode, Check, ExternalLink, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePuterAI } from '@/hooks/usePuterAI';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  initialTab?: ActiveTab;
  onExclude?: () => void;
  onClose: () => void;
}

type ActiveTab = 'view' | 'qr';

export default function ImageModal({ isOpen, imageUrl, title, initialTab = 'view', onExclude, onClose }: ImageModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('view');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const { busy, generateCaption, classifyTags } = usePuterAI();

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setCopied(false);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || !title) return;
    void classifyTags(title).then(setTags);
    void generateCaption(title, []).then(setCaption);
  }, [classifyTags, generateCaption, isOpen, title]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!imageUrl) return null;

  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(proxyUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bts-photo-${Date.now()}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(proxyUrl);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }, 'image/png');
    } catch {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? 'Foto BTS', url: imageUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenNewTab = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=8f3ac4&bgcolor=000000&data=${encodeURIComponent(imageUrl)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-4xl border border-(--border) bg-(--surface-strong) text-foreground shadow-(--shadow-soft) backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex gap-2">
                {(['view', 'qr'] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                      activeTab === tab ? 'bg-(--accent) text-white' : 'text-(--muted) hover:bg-(--surface-soft) hover:text-foreground'
                    }`}
                  >
                    {tab === 'view' ? 'Vista' : 'Codigo QR'}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-(--muted) transition-colors hover:bg-(--surface-soft) hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {activeTab === 'view' ? (
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="min-w-0">
                    <img
                      src={imageUrl}
                      alt={title ?? 'Foto BTS'}
                      className="max-h-[56vh] w-full rounded-[1.4rem] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                    />
                   
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-2 px-2 pt-2">
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-(--surface-soft) px-3 py-1 text-xs text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.18)]">#{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-row flex-wrap gap-2 md:w-44 md:flex-col">
                    <ActionBtn
                      icon={downloading ? undefined : <Download className="h-4 w-4" />}
                      label={downloading ? 'Descargando...' : 'Descargar'}
                      onClick={handleDownload}
                      disabled={downloading}
                    />
                    <ActionBtn
                      icon={copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      label={copied ? 'Copiado' : 'Copiar imagen'}
                      onClick={handleCopyImage}
                    />
                    <ActionBtn icon={<Share2 className="h-4 w-4" />} label="Compartir" onClick={handleShare} />
                    <ActionBtn icon={<ExternalLink className="h-4 w-4" />} label="Ver completa" onClick={handleOpenNewTab} />
                   
                    {onExclude ? (
                      <ActionBtn
                        icon={<Ban className="h-4 w-4" />}
                        label="Descartar imagen"
                        onClick={onExclude}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-75 flex-col items-center justify-center gap-6 p-10">
                  <p className="text-sm text-(--muted)">Escanea para abrir esta imagen en cualquier dispositivo</p>
                  <div className="rounded-2xl border border-(--accent)/40 bg-(--surface) p-3">
                    <img src={qrApiUrl} alt="Codigo QR" className="h-48 w-48 rounded-xl" />
                  </div>
                  <p className="max-w-xs break-all text-center text-xs text-(--muted)">{imageUrl}</p>
                </div>
              )}
            </div>

            {activeTab === 'qr' ? (
              <div className="flex justify-center px-6 py-4">
                <ActionBtn icon={<ExternalLink className="h-4 w-4" />} label="Abrir nueva pestaña" onClick={handleOpenNewTab} />
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all shadow-[0_16px_40px_rgba(0,0,0,0.22)] ${
        active
          ? 'bg-(--accent) text-white'
          : 'bg-(--surface-soft) text-foreground hover:bg-(--surface)'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon}
      {label}
    </button>
  );
}
