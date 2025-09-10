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
      bg-yellow-100 border-2 border-yellow-300 rounded-2xl p-6 
      animate-fade-in shadow-lg mx-4 mt-4
    `}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">💡</span>
        <h3 className="text-lg font-bold text-yellow-800">Hint</h3>
      </div>
      <p className="text-yellow-900 text-lg leading-relaxed">{hint}</p>
    </div>
  );
}