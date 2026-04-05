"use client";

import { useEffect, useState, type ComponentType } from 'react';
import { usePathname } from 'next/navigation';

function LowPowerBackdrop() {
  return (
    <div className="matrix-vignette mobile-particle-backdrop fixed inset-0 z-[-1] overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="mobile-particle-layer mobile-particle-layer-1" />
      <div className="mobile-particle-layer mobile-particle-layer-2" />
      <div className="mobile-particle-layer mobile-particle-layer-3" />
      <div className="mobile-particle-glow" />
    </div>
  );
}

export default function ThreeBackground() {
  const pathname = usePathname();
  const [isLowPower, setIsLowPower] = useState(false);
  const [DesktopBackground, setDesktopBackground] = useState<ComponentType | null>(null);

  useEffect(() => {
    const updatePowerMode = () => {
      setIsLowPower(
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.innerWidth < 768,
      );
    };

    updatePowerMode();
    window.addEventListener('resize', updatePowerMode);
    return () => window.removeEventListener('resize', updatePowerMode);
  }, []);

  useEffect(() => {
    if (isLowPower || pathname?.startsWith('/videos')) return;

    let cancelled = false;
    void import('./ThreeBackgroundClient').then((module) => {
      if (cancelled) return;
      setDesktopBackground(() => module.default);
    });

    return () => {
      cancelled = true;
    };
  }, [isLowPower, pathname]);

  // On the videos page we use DiagonalImageGrid instead, so skip Three.js
  // to avoid running two animation loops simultaneously.
  if (pathname?.startsWith('/videos')) return null;

  if (isLowPower) return <LowPowerBackdrop />;

  if (!DesktopBackground) return null;

  return <DesktopBackground />;
}