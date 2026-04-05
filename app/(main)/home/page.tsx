"use client";

import MasonryFeed from "../../../components/feed/MasonryFeed";
import { btsMemberProfiles } from "@/lib/btsMembers";
import { motion } from "framer-motion";
import { useState } from "react";

export default function HomePage() {
  const [member, setMember] = useState<string>('');

  return (
    <div className="relative min-h-screen">
      <section className="page-shell px-1 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7 sm:py-8"
        >
          <div className="flex flex-col gap-6">
            <div className="max-w-3xl">
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Galeria de fotos de BTS</h1>
            </div>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-(--muted)">
              <span className="h-px flex-1 bg-white/10" />
              <span>Filtro por integrante</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMember('')}
                className={`rounded-full px-4 py-2 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.14)] ${member === '' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}
              >
                Todo BTS
              </button>
              {btsMemberProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setMember(profile.id)}
                  className={`rounded-full px-4 py-2 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.14)] ${member === profile.id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}
                >
                  {profile.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <MasonryFeed filterType="image" member={member || undefined} />
    </div>
  );
}
