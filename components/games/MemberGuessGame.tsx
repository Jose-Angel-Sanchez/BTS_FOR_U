'use client';

import { useMemo, useState } from 'react';
import { BTS_MEMBERS } from '@/lib/trivia';

type Round = {
  clue: string;
  correct: string;
  options: string[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildRound(): Round {
  const member = BTS_MEMBERS[Math.floor(Math.random() * BTS_MEMBERS.length)];
  const wrong = shuffle(BTS_MEMBERS.filter((m) => m.stageName !== member.stageName).map((m) => m.stageName)).slice(0, 3);
  const clues = [
    `Su personaje BT21 es ${member.bt21}.`,
    `Su lanzamiento solista es ${member.soloRelease}.`,
    `Su ciudad de origen es ${member.hometown}.`,
    `Su nombre completo es ${member.fullName}.`,
  ];

  return {
    clue: clues[Math.floor(Math.random() * clues.length)],
    correct: member.stageName,
    options: shuffle([member.stageName, ...wrong]),
  };
}

export default function MemberGuessGame() {
  const total = 6;
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const rounds = useMemo(() => Array.from({ length: total }, () => buildRound()), [sessionKey]);
  const current = rounds[round];
  const done = round >= total;

  function choose(option: string) {
    if (selected || done) return;
    setSelected(option);
    if (option === current.correct) setScore((value) => value + 1);

    window.setTimeout(() => {
      setSelected(null);
      setRound((value) => value + 1);
    }, 900);
  }

  function restart() {
    setSessionKey((value) => value + 1);
    setRound(0);
    setScore(0);
    setSelected(null);
  }

  if (done) {
    return (
      <section className="surface-panel-strong rounded-4xl p-6 sm:p-8">
        <h3 className="text-2xl font-black">Adivina el integrante</h3>
        <p className="mt-3 text-sm text-white/70">Resultado: {score} / {total}</p>
        <button
          onClick={restart}
          className="mt-6 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          Jugar de nuevo
        </button>
      </section>
    );
  }

  return (
    <section className="surface-panel-strong rounded-4xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-black">Adivina el integrante</h3>
        <span className="text-xs uppercase tracking-[0.16em] text-white/70">Ronda {round + 1} / {total}</span>
      </div>

      <p className="mt-6 text-lg font-semibold">{current.clue}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {current.options.map((option) => {
          const isSelected = selected === option;
          const isCorrect = option === current.correct;
          const stateClass = selected
            ? isCorrect
              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
              : isSelected
                ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                : 'border-white/15 bg-white/5 text-white/55'
            : 'border-white/20 bg-white/5 text-white hover:bg-white/12';

          return (
            <button
              key={option}
              onClick={() => choose(option)}
              disabled={!!selected}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${stateClass}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
