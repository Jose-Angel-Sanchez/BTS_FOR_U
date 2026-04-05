import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== 'production';

  const scriptSrc = ["'self'", "'unsafe-inline'", 'https://js.puter.com'];
  const connectSrc = [
    "'self'",
    'https://www.reddit.com',
    'https://commons.wikimedia.org',
    'https://js.puter.com',
    'https://api.puter.com',
    'https://*.puter.com',
    'wss://api.puter.com',
    'wss://*.puter.com',
    'images.unsplash.com',
    'cdn.discordapp.com',
    'i.pinimg.com',
    'i.imgur.com',
    'media.gettyimages.com',
  ];

  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push('ws://localhost:*', 'http://localhost:*');
  }

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      `script-src ${scriptSrc.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src ${connectSrc.join(' ')}`,
      "frame-src https://www.youtube-nocookie.com",
      "media-src 'self' https:",
    ].join('; '),
  );

  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: '/:path*',
};
