"use client";

import dynamic from 'next/dynamic';

const MasonryFeed = dynamic(() => import('@/components/feed/MasonryFeed'), {
  ssr: false,
  loading: () => (
    <div className="page-shell px-3 py-10">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-bts-purple" />
    </div>
  ),
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <section className="page-shell px-1 pb-4">
        <div className="overflow-hidden rounded-4xl px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-6">
            <div className="max-w-3xl">
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Galeria de fotos de BTS</h1>
            </div>
          </div>
        </div>
      </section>

      <MasonryFeed filterType="image" />
    </div>
  );
}
