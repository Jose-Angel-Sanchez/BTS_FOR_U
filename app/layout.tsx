import type { Metadata } from 'next';
import './globals.css';
import ThreeBackground from '@/components/background/ThreeBackground';

export const metadata: Metadata = {
  title: 'BTS For U 💜',
  description: 'Galeria visual, juegos y videos de BTS en una experiencia nativa en español.',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `(() => {
    try {
      const stored = localStorage.getItem('bts.theme');
      const theme = stored === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
    } catch {}
  })();`;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-transparent text-foreground relative overflow-x-hidden">
        <ThreeBackground />
        <div className="matrix-vignette" aria-hidden="true" />
        <div className="flex-1 flex flex-col relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
