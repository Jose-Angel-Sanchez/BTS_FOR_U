'use client';

import { useState } from 'react';
import TriviaGame from '@/components/games/TriviaGame';
import SpaceInvadersImageGame from '@/components/games/SpaceInvadersImageGame';
import FeedPuzzleGame from '@/components/games/FeedPuzzleGame';

type GameTab = 'trivia' | 'invaders' | 'puzzle';

const tabs: Array<{ id: GameTab; label: string }> = [
  { id: 'trivia', label: 'Trivia IA' },
  { id: 'invaders', label: 'Atari Breakout BTS' },
  { id: 'puzzle', label: 'Puzzle Feed' },
];

export default function GamesPage() {
  const [active, setActive] = useState<GameTab>('trivia');

  return (
    <div className="relative min-h-screen px-4 py-6">
      <section className="page-shell space-y-6 px-1">
        <div className="surface-panel-strong rounded-4xl p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all sm:text-sm ${
                  active === tab.id 
                    ? 'bg-(--accent) text-white' 
                    : 'bg-(--surface-soft) text-(--text) hover:bg-(--border)'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          {active === 'trivia' ? <TriviaGame /> : null}
          {active === 'invaders' ? <SpaceInvadersImageGame /> : null}
          {active === 'puzzle' ? <FeedPuzzleGame /> : null}
        </div>
      </section>
    </div>
  );
}
