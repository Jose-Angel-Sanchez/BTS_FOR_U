'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function WelcomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <header className="page-shell sticky top-0 z-20 pt-4">
        <div className="surface-panel flex items-center justify-between rounded-[1.75rem] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--accent) text-white shadow-[0_0_28px_rgba(143,58,196,0.38)]">
              <span className="text-xs font-black uppercase tracking-[0.24em]">BTS</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-(--muted)">BTS Discovery</p>
              <p className="text-sm font-semibold">Archivo visual y fan space</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="page-shell relative z-10 flex flex-1 items-center px-1 pb-8 pt-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            <p className="mb-4 text-xs uppercase tracking-[0.34em] text-(--muted)">Inicio</p>
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-7xl lg:text-[6.5rem]">
              Todo BTS en un solo lugar.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-(--muted) sm:text-lg">
              Galeria del grupo, fotos por integrante, videos oficiales y juegos para ARMY en una experiencia inmersiva.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/home"
                  className="inline-flex items-center gap-2 rounded-2xl bg-(--accent) px-6 py-4 text-sm font-semibold text-white shadow-[0_0_40px_rgba(143,58,196,0.38)]"
                  style={{ color: '#fff' }}
                >
                  Entrar a la galeria
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/videos" className="surface-panel inline-flex items-center rounded-2xl px-6 py-4 text-sm font-semibold">
                  Ver videos
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.18 }}
            className="surface-panel-strong relative overflow-hidden rounded-4xl p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(143,58,196,0.24),transparent_42%)]" />
            <div className="relative space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-(--muted)">Explora</p>
                <p className="mt-2 text-xl font-bold">Fotos del grupo y de cada integrante</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-(--muted)">Descubre</p>
                <p className="mt-2 text-xl font-bold">Videos oficiales y playlists para acompanarte</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-(--muted)">Juega</p>
                <p className="mt-2 text-xl font-bold">Retos de trivia y puzzle inspirados en BTS</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
