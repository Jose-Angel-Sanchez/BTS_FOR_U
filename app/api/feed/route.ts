import { NextResponse } from 'next/server';
import { btsMemberProfiles } from '@/lib/btsMembers';
import { fetchBtsImages } from '@/lib/btsScraper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageNumber = Number.parseInt(searchParams.get('page') ?? '0', 10) || 0;
  const sizeNumber = Math.max(24, Math.min(72, Number.parseInt(searchParams.get('size') ?? '36', 10) || 36));
  const member = (searchParams.get('member') ?? '').toLowerCase();
  const normalizedMember = btsMemberProfiles.some((item) => item.id === member) ? member : '';

  try {
    const scraped = await fetchBtsImages(pageNumber, sizeNumber * 4, normalizedMember || undefined);
    const seen = new Set<string>();
    const items = scraped.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    }).slice(0, sizeNumber);

    return NextResponse.json(
      {
        items,
        page: pageNumber,
        size: sizeNumber,
        nextPage: pageNumber + 1,
        source: 'web-social-priority',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=240',
        },
      },
    );
  } catch (error) {
    return NextResponse.json({
      items: [],
      page: pageNumber,
      size: sizeNumber,
      nextPage: pageNumber + 1,
      fallback: true,
      reason: error instanceof Error ? error.message : 'feed unavailable',
    });
  }
}
