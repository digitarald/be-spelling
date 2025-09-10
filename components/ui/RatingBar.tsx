'use client';

import { Rating } from '@/lib/types';

interface RatingBarProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
  className?: string;
}

export function RatingBar({ onRate, disabled = false, className = '' }: RatingBarProps) {
  const ratings = [
    { value: 'NAILED' as const, emoji: '🌟', text: 'Nailed it!', color: 'bg-green-500 hover:bg-green-600' },
    { value: 'ALMOST' as const, emoji: '👍', text: 'Almost', color: 'bg-orange-500 hover:bg-orange-600' },
    { value: 'STUMPED' as const, emoji: '🤔', text: 'Stumped', color: 'bg-red-500 hover:bg-red-600' },
  ];

  return (
    <div className={`${className} space-y-3`}>
      <h3 className="text-center text-lg font-semibold text-gray-700 mb-4">
        How did you do?
      </h3>
      <div className="flex flex-col gap-3 px-4">
        {ratings.map((rating) => (
          <button
            key={rating.value}
            onClick={() => onRate(rating.value)}
            disabled={disabled}
            className={`
              ${rating.color}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              text-white font-bold py-4 px-6 rounded-2xl text-xl
              transition-all duration-200 shadow-lg touch-manipulation
              flex items-center justify-center gap-3
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