'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface VideoModalProps {
  videoId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoModal({ videoId, isOpen, onClose }: VideoModalProps) {
  const close = () => {
    onClose();
  };
  
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && videoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10">
          
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            onClick={close}
            className="absolute inset-0 bg-black/80"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-5xl aspect-video overflow-hidden rounded-2xl bg-transparent shadow-2xl backdrop-blur-xl"
          >
            {/* Close button */}
            <button 
              onClick={close}
              className="absolute right-4 top-4 z-20 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-white hover:text-black backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe 
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`}
              title="Video de BTS"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute left-0 top-0 h-full w-full border-0"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
