'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Trophy, Zap, Heart, Sparkles } from 'lucide-react';
import type { TriviaQuestion } from '../../lib/trivia';
import { usePuterAI } from '@/hooks/usePuterAI';

type GameState = 'intro' | 'playing' | 'gameover';

const difficultyColor = {
  easy: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  medium: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  hard: 'text-rose-300 border-rose-400/30 bg-rose-400/10',
};

export default function TriviaGame() {
  const { busy, generateTriviaWithPuter } = usePuterAI();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  async function startGame() {
    const generated = await generateTriviaWithPuter(8);
    setQuestions(generated);
    setCurrentIdx(0);
    setScore(0);
    setSelected(null);
    setStreak(0);
    setBestStreak(0);
    setGameState('playing');
  }

  function handleSelect(option: string) {
    if (selected) return;
    setSelected(option);

    const correct = option === questions[currentIdx].correctAnswer;
    const newStreak = correct ? streak + 1 : 0;

    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    if (correct) setScore((value) => value + 1);

    window.setTimeout(() => {
      setSelected(null);
      if (currentIdx < questions.length - 1) setCurrentIdx((value) => value + 1);
      else setGameState('gameover');
    }, 1300);
  }

  if (gameState === 'intro') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-panel-strong mx-auto flex w-full max-w-3xl flex-col items-center rounded-[2rem] px-6 py-10 text-center"
      >

        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Trivia</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-(--muted) sm:text-base">
          Responde ocho preguntas sobre BTS y busca la mejor racha posible.
        </p>
        <button
          onClick={startGame}
          disabled={busy}
          className="mt-8 rounded-[1.2rem] bg-(--accent) px-8 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_30px_rgba(143,58,196,0.35)]"
        >
          {busy ? 'Generando trivia...' : 'Empezar'}
        </button>
      </motion.div>
    );
  }

  if (gameState === 'gameover') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-panel-strong mx-auto flex w-full max-w-3xl flex-col items-center rounded-[2rem] px-6 py-10 text-center"
      >
        <h2 className="text-4xl font-black tracking-tight text-(--accent)">Resultado final</h2>
        <p className="mt-3 text-2xl font-bold">{score} / {questions.length} correctas</p>
        <p className="mt-2 text-sm text-(--muted)">{pct}% de acierto · Mejor racha: {bestStreak}</p>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
          {[
            { label: 'Puntaje', value: score, icon: <Trophy className="mx-auto mb-2 h-5 w-5 text-amber-300" /> },
            { label: 'Acierto', value: `${pct}%`, icon: <Heart className="mx-auto mb-2 h-5 w-5 text-pink-300" /> },
            { label: 'Racha', value: bestStreak, icon: <Zap className="mx-auto mb-2 h-5 w-5 text-(--accent)" /> },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.4rem] border border-(--border) bg-(--surface-soft) p-5">
              {item.icon}
              <div className="text-2xl font-black">{item.value}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-(--muted)\">{item.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={startGame}
          disabled={busy}
          className="mt-8 inline-flex items-center gap-3 rounded-[1.2rem] bg-(--accent) px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white"
        >
          <RefreshCw className="h-4 w-4" />
          {busy ? 'Generando trivia...' : 'Jugar otra vez'}
        </button>
      </motion.div>
    );
  }

  const q = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="surface-panel-strong mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem]">
      <div className="h-1.5 w-full bg-white/8">
        <motion.div className="h-full bg-(--accent)" animate={{ width: `${progress}%` }} />
      </div>

      <div className="p-6 sm:p-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-(--muted)">Pregunta {currentIdx + 1} / {questions.length}</p>
            <p className="mt-2 text-sm text-(--muted)">Selecciona una respuesta y continua.</p>
          </div>
          <div className="flex items-center gap-3">
            {streak >= 2 && <span className="text-sm font-bold text-orange-300">Racha {streak}</span>}
            <span className={`rounded-2xl border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${difficultyColor[q.difficulty]}`}>
              {q.difficulty}
            </span>
            <span className="text-sm font-semibold text-(--muted)">Puntaje {score}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.24 }}
          >
            <h3 className="mb-8 text-2xl font-bold leading-snug tracking-tight">{q.question}</h3>

            <div className="grid gap-3">
              {q.options.map((option, index) => {
                const isSelected = selected === option;
                const isCorrect = option === q.correctAnswer;

                let style = 'border-[var(--border)] bg-[var(--surface-soft)] text-foreground hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]';
                if (selected) {
                  if (isCorrect) style = 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100';
                  else if (isSelected) style = 'border-rose-400/40 bg-rose-400/15 text-rose-100';
                  else style = 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)] opacity-55';
                }

                return (
                  <motion.button
                    key={`${option}-${index}`}
                    onClick={() => handleSelect(option)}
                    disabled={!!selected}
                    whileHover={!selected ? { y: -2 } : {}}
                    whileTap={!selected ? { scale: 0.99 } : {}}
                    className={`w-full rounded-[1.4rem] border px-5 py-4 text-left transition-all ${style}`}
                  >
                    <span className="mr-3 text-xs uppercase tracking-[0.18em] text-(--muted)">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-base font-medium">{option}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
