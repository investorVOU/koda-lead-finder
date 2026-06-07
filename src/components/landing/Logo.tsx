export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* K-mark icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="url(#logo-g)" />
        <path
          d="M9 8v16M9 16l7-8M9 16l8 8"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="16" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="22" cy="16" r="1.5" fill="url(#logo-g)" />
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2a9d6f" />
            <stop offset="100%" stopColor="#1ec98a" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      <span className="font-display text-lg font-bold tracking-tight">
        Koda<span className="text-primary">rai</span>
      </span>
    </div>
  );
}
