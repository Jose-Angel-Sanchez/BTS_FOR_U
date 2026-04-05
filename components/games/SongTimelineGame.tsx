'use client';

import { useMemo, useState } from 'react';

type TimelineItem = {
  song: string;
  year: number;
  options: number[];
};

const baseSongs: Array<{ song: string; year: number }> = [
  { song: 'No More Dream', year: 2013 },
  { song: 'I Need U', year: 2015 },
  { song: 'Blood Sweat & Tears', year: 2016 },
  { song: 'Spring Day', year: 2017 },
  { song: 'Dynamite', year: 2020 },
  { song: 'Butter', year: 2021 },
  { song: 'Yet To Come', year: 2022 },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTimelineItems(total = 6): TimelineItem[] {
  return shuffle(baseSongs).slice(0, total).map((entry) => {
    const years = shuffle(baseSongs.map((song) => song.year).filter((year) => year !== entry.year)).slice(0, 3);
    return {
      song: entry.song,
      year: entry.year,
      options: shuffle([entry.year, ...years]),
    };
  });
}

export default function SongTimelineGame() {
  const total = 6;
  const [cursor, setCursor] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [seed, setSeed] = useState(0);

  const timeline = useMemo(() => buildTimelineItems(total), [seed]);
  const item = timeline[cursor];
  const done = cursor >= total;

  function answer(year: number) {
    if (selected !== null || done) return;
    setSelected(year);
    if (year === item.year) setScore((value) => value + 1);

    window.setTimeout(() => {
      setSelected(null);
      setCursor((value) => value + 1);
    }, 900);
  }

  function restart() {
    setSeed((value) => value + 1);
    setCursor(0);
    setScore(0);
    setSelected(null);
  }

  if (done) {
    return (
      <section className="surface-panel-strong rounded-4xl p-6 sm:p-8">
        <h3 className="text-2xl font-black">Linea del tiempo BTS</h3>
        <p className="mt-3 text-sm text-white/70">Aciertos: {score} / {total}</p>
        <button
          onClick={restart}
          className="mt-6 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="surface-panel-strong rounded-4xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-black">Linea del tiempo BTS</h3>
        <span className="text-xs uppercase tracking-[0.16em] text-white/70">Pregunta {cursor + 1} / {total}</span>
      </div>

      <p className="mt-6 text-lg font-semibold">En que año salio: {item.song}?</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {item.options.map((option) => {
          const isSelected = selected === option;
          const isCorrect = option === item.year;
          const stateClass = selected !== null
            ? isCorrect
              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
              : isSelected
                ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                : 'border-white/15 bg-white/5 text-white/55'
            : 'border-white/20 bg-white/5 text-white hover:bg-white/12';

          return (
            <button
              key={option}
              onClick={() => answer(option)}
              disabled={selected !== null}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${stateClass}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
