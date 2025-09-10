'use client';

interface HintCardProps {
  hint: string;
  isVisible: boolean;
  className?: string;
}

export function HintCard({ hint, isVisible, className = '' }: HintCardProps) {
  if (!isVisible) return null;

  return (
    <div className={`
      ${className}
      bg-[var(--hint-bg)] border-2 border-[color:var(--hint-border)] rounded-2xl p-4
      animate-fade-in shadow-lg
    `}>
      <p className="flex items-start gap-2 text-lg leading-relaxed text-[var(--hint-text)]">
        <span className="text-2xl leading-none">💡</span>
        <span>{hint}</span>
      </p>
    </div>
  );
}