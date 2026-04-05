import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  'preview.redd.it',
  'i.redd.it',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'img.youtube.com',
  'i.ytimg.com',
  'lastfm.freetls.fastly.net',
  'pbs.twimg.com',
];
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((host) => parsed.hostname.endsWith(host))) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const response = await fetch(parsed.toString(), {
    headers: {
      'User-Agent': 'BTSDiscovery/1.0',
      Accept: 'image/*,*/*',
    },
    cache: 'force-cache',
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': 'attachment; filename="bts-photo.jpg"',
    },
  });
}
