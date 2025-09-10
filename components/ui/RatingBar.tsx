'use client';

import { Rating } from '@/lib/types';

interface RatingBarProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
  className?: string;
}

export function RatingBar({ onRate, disabled = false, className = '' }: RatingBarProps) {
  const ratings = [
    { value: 'NAILED' as const, emoji: '🌟', text: 'Nailed it!', color: 'bg-[var(--rate-nailed)]' },
    { value: 'ALMOST' as const, emoji: '👍', text: 'Almost', color: 'bg-[var(--rate-almost)]' },
    { value: 'STUMPED' as const, emoji: '🤔', text: 'Stumped', color: 'bg-[var(--rate-stumped)]' },
  ];

  return (
    <div className={`${className} space-y-3`}>
      <div className="flex flex-col gap-3 px-4">
        {ratings.map((rating) => (
          <button
            key={rating.value}
            onClick={() => onRate(rating.value)}
            disabled={disabled}
            className={`
              ${rating.color}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:brightness-95'}
              font-bold py-4 px-6 rounded-2xl text-xl
              transition-all duration-200 shadow-lg touch-manipulation border border-[color:var(--border)]
              flex items-center justify-center gap-3 text-[var(--btn-text)] dark:text-[var(--btn-text-contrast)]
            `}
          >
            <span className="text-2xl">{rating.emoji}</span>
            <span>{rating.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}