'use client';

import Link from 'next/link';
import { Home, Gamepad2, Video, User, Trash2, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { clearInteractions, clearPreferences } from '@/store/personalization';
import ThemeToggle from '@/components/layout/ThemeToggle';
import SiteFooter from '@/components/layout/SiteFooter';

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  const navItems = [
    { name: 'Inicio', href: '/home', icon: Home },
    { name: 'Juegos', href: '/games', icon: Gamepad2 },
    { name: 'Videos', href: '/videos', icon: Video },
  ];

  const onNavClick = useCallback((event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href !== '/home') return;

    if (pathname.startsWith('/home')) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 40);
  }, [pathname]);

  useEffect(() => {
    const updateOffset = () => {
      if (!navRef.current) return;
      const height = navRef.current.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--app-top-offset', `${Math.ceil(height + 10)}px`);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      observer = new ResizeObserver(updateOffset);
      observer.observe(navRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateOffset);
      observer?.disconnect();
    };
  }, []);

  return (
    <nav ref={navRef} className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <div className="page-shell rounded-3xl bg-transparent px-4 py-3 shadow-(--shadow-soft) backdrop-blur-xl sm:px-5 flex justify-around gap-3">
        <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-(--accent) text-white shadow-[0_0_32px_rgba(143,58,196,0.35)]">
              <span className="text-xs font-black uppercase tracking-[0.2em]">BTS</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.28em] text-(--muted)">BTS Discovery</p>
              <p className="text-sm font-semibold text-foreground">Universo visual</p>
            </div>
          </Link>
        <div className="flex justify-between gap-3">
          <div className="hidden md:flex items-center align-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <motion.div key={item.name} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href={item.href}
                    onClick={(event) => onNavClick(event, item.href)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-(--accent-soft) text-(--accent)'
                        : 'text-(--muted) hover:bg-(--surface-soft) hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute right-5 top-[4.6rem] z-20 w-64 rounded-3xl bg-black/18 p-3 shadow-(--shadow-soft) backdrop-blur-2xl"
            >
              <div className="mb-3 flex flex-col gap-1 rounded-2xl bg-white/5 p-3 md:hidden">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(event) => {
                        onNavClick(event, item.href);
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                        isActive ? 'text-(--accent)' : 'text-(--muted)'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  clearInteractions();
                  clearPreferences();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm hover:bg-white/8"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar datos locales
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={(event) => onNavClick(event, item.href)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                pathname.startsWith(item.href)
                    ? 'border-(--accent)/35 bg-(--accent-soft) text-(--accent)'
                    : 'border-transparent bg-white/5 text-(--muted)'
              }`}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
        </div>
      </div>

      <div className="page-shell px-1">
        <SiteFooter />
      </div>
    </nav>
  );
}
