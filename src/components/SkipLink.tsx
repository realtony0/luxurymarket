export default function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed left-4 top-4 z-[100] -translate-y-full rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
    >
      Aller au contenu
    </a>
  );
}
