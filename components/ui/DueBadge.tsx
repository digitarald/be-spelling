'use client';

interface DueBadgeProps {
  count: number;
  className?: string;
}

export function DueBadge({ count, className = '' }: DueBadgeProps) {
  if (count === 0) {
    return (
      <div className={`${className} bg-[var(--surface-alt)] text-[var(--muted)] px-4 py-2 rounded-full text-sm font-medium border border-[color:var(--border)]`}>
        🎉 All caught up!
      </div>
    );
  }

  return (
    <div className={`${className} bg-[var(--danger)] text-[var(--btn-text)] dark:text-[var(--btn-text-contrast)] px-4 py-2 rounded-full text-sm font-bold shadow-md`}>
      📚 {count} word{count === 1 ? '' : 's'} due
    </div>
  );
}