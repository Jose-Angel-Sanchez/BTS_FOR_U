'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const rootTheme = document.documentElement.dataset.theme;
  if (rootTheme === 'light' || rootTheme === 'dark') return rootTheme;
  return localStorage.getItem('bts.theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  localStorage.setItem('bts.theme', next);
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'bts.theme') return;
      const next = event.newValue === 'light' ? 'light' : 'dark';
      setTheme(next);
      document.documentElement.dataset.theme = next;
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        className={`surface-panel flex h-11 w-11 items-center justify-center rounded-2xl text-foreground ${className}`}
      />
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={toggleTheme}
      className={`surface-panel flex h-11 w-11 items-center justify-center rounded-2xl text-foreground transition-colors hover:border-(--accent)/40 hover:text-(--accent) ${className}`}
      aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
      title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
    >
      {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </motion.button>
  );
}
