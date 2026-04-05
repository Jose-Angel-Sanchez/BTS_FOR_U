'use client';

import Link from 'next/link';
import { officialGroupLinks, officialMemberLinks } from '@/lib/officialLinks';

const socialLinks = [
  ...officialGroupLinks.map((item) => ({ ...item, external: true })),
  ...officialMemberLinks.map((item) => ({ ...item, external: true })),
] as const;

const repeated = [...socialLinks, ...socialLinks];

export default function SiteFooter() {
  return (
    <div className="mt-2 overflow-hidden py-1">
      <div className="sitemap-marquee-track">
        {repeated.map((item, index) => (
          <Link
            key={`${item.label}-${item.href}-${index}`}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noreferrer noopener' : undefined}
            className="sitemap-pill whitespace-nowrap px-4 py-2 text-xs font-semibold tracking-[0.14em] text-(--accent) transition-colors hover:text-(--transparent) bg-transparent backdrop-blur-xl"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
