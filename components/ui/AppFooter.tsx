import Link from 'next/link';

export function AppFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`mt-12 pb-6 text-center text-xs text-[var(--muted)] ${className}`}
      role="contentinfo"
    >
      <nav aria-label="Secondary" className="flex justify-center gap-8 mb-2">
        <Link
          href="/manage"
          className="hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span aria-hidden>📚</span> <span>Manage</span>
        </Link>
        <Link
          href="/settings"
          className="hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span aria-hidden>⚙️</span> <span>Settings</span>
        </Link>
      </nav>
      <p className="opacity-70">Be-Spelling · Local-first learning</p>
    </footer>
  );
}
