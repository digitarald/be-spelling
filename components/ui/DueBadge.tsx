'use client';

interface DueBadgeProps {
  count: number;
  className?: string;
}

export function DueBadge({ count, className = '' }: DueBadgeProps) {
  if (count === 0) {
    return (
      <div className={`${className} bg-gray-100 text-gray-500 px-4 py-2 rounded-full text-sm font-medium`}>
        🎉 All caught up!
      </div>
    );
  }

  return (
    <div className={`${className} bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md`}>
      📚 {count} word{count === 1 ? '' : 's'} due
    </div>
  );
}