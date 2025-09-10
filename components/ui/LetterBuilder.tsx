"use client";

import { useEffect, useState } from 'react';

interface LetterUnit {
  id: number; // unique id within pool
  char: string;
  distractor?: boolean; // true if not part of the target word
}

export interface LetterBuilderProps {
  target: string;
  value: string; // current assembled value (controlled)
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Mobile-friendly letter selection component to build the target word
 * instead of typing on the system keyboard.
 */
export function LetterBuilder({ target, value, onChange, onComplete, disabled, className }: LetterBuilderProps) {
  const normalized = target.trim();
  const letters: LetterUnit[] = normalized.split('').map((c, i) => ({ id: i, char: c }));
  const [shuffled, setShuffled] = useState<LetterUnit[]>([]);
  const [usedIds, setUsedIds] = useState<number[]>([]);

  // Initialize / reset when target changes
  useEffect(() => {
    // Build a pool with original letters + extra distractor letters (false negatives)
    const base = letters;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const present = new Set(base.map(l => l.char.toLowerCase()));
    // Decide how many distractors: scale with word length (60%) clamped 3..8
    const desiredExtras = Math.min(8, Math.max(3, Math.ceil(normalized.length * 0.6)));
    const available = alphabet.split('').filter(c => !present.has(c));
    const extraChars = shuffle(available).slice(0, desiredExtras);
    const extras: LetterUnit[] = extraChars.map((c, idx) => ({
      id: base.length + idx,
      char: c,
      distractor: true,
    }));
    const pool = shuffle([...base, ...extras]);
    setShuffled(pool);
    setUsedIds([]);
    if (value !== '') onChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const handlePick = (unit: LetterUnit) => {
    if (disabled) return;
    if (usedIds.includes(unit.id)) return; // already used
    const next = value + unit.char;
    setUsedIds([...usedIds, unit.id]);
    onChange(next);
    if (next.length === normalized.length) {
      onComplete?.(next);
    }
  };

  const handleBackspace = () => {
    if (disabled) return;
    if (!value.length) return;
    // remove last used id corresponding to last letter in value
    const nextUsed = [...usedIds];
    nextUsed.pop();
    setUsedIds(nextUsed);
    onChange(value.slice(0, -1));
  };

  const handleReset = () => {
    if (disabled) return;
    setUsedIds([]);
    onChange('');
  };

  return (
    <div className={className}>
      {/* Display current attempt */}
      <div className="mb-4 bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 min-h-[64px] flex items-center justify-center gap-2 text-2xl font-bold tracking-wide select-none">
        {normalized.split('').map((_, i) => (
          <span
            key={i}
            className={
              'w-10 h-12 flex items-center justify-center rounded-xl ' +
              (value[i]
                ? 'bg-blue-500 text-white animate-fade-in'
                : 'bg-white text-gray-300 border border-gray-200')
            }
          >
            {value[i] ?? '•'}
          </span>
        ))}
      </div>

      {/* Letter bank */}
      <div
        className="grid gap-3 mb-4"
        style={{
          // Dynamic column count based on total letters (4..8 columns)
          gridTemplateColumns: `repeat(${Math.min(8, Math.max(4, Math.ceil(shuffled.length / 2)))}, minmax(0,1fr))`,
        }}
      >
        {shuffled.map((unit) => {
          const used = usedIds.includes(unit.id);
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => handlePick(unit)}
              disabled={disabled || used}
              className={
                'h-14 rounded-2xl text-2xl font-bold shadow-md transition-all touch-manipulation ' +
                (used
                  ? 'bg-gray-200 text-gray-400 line-through'
                  : 'bg-white text-gray-800 hover:bg-blue-100 active:scale-95')
              }
            >
              {unit.char}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="flex-1 bg-gray-500 disabled:opacity-40 text-white font-bold py-3 rounded-2xl shadow-md active:scale-95"
        >
          ⌫ Undo
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled || value.length === 0}
          className="flex-1 bg-gray-400 disabled:opacity-40 text-white font-bold py-3 rounded-2xl shadow-md active:scale-95"
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
}
