"use client";

import MasonryFeed from "../../../components/feed/MasonryFeed";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <section className="page-shell px-1 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-4xl px-5 py-6 sm:px-7 sm:py-8"
        >
          <div className="flex flex-col gap-6">
            <div className="max-w-3xl">
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Galeria de fotos de BTS</h1>
            </div>
          </div>
        </motion.div>
      </section>

      <MasonryFeed filterType="image" />
    </div>
  );
}
