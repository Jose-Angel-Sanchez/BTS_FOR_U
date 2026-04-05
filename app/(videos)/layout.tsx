import Navbar from "@/components/layout/Navbar";

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1" style={{ paddingTop: 'var(--app-top-offset, 7rem)' }}>
        {children}
      </main>
    </div>
  );
}
