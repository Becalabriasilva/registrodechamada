// Decorative kimono-inspired background motif (SVG). Pure presentation.
export function KimonoBg({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 900"
        className="absolute inset-0 h-full w-full opacity-[0.08]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="seigaiha" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 40 A40 40 0 0 1 80 40" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M-40 40 A40 40 0 0 1 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M40 40 A40 40 0 0 1 120 40" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </pattern>
          <linearGradient id="silk" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1200" height="900" fill="url(#seigaiha)" className="text-primary" />
      </svg>

      {/* Stylized kimono silhouette */}
      <svg
        viewBox="0 0 600 800"
        className="absolute -right-24 bottom-0 h-[110%] w-auto opacity-[0.12]"
        aria-hidden="true"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
          {/* collar */}
          <path d="M300 40 L240 120 L240 720 L160 760 L160 200 L80 280 L80 760" />
          <path d="M300 40 L360 120 L360 720 L440 760 L440 200 L520 280 L520 760" />
          {/* center fold */}
          <path d="M300 120 L300 760" strokeDasharray="6 6" />
          {/* obi sash */}
          <rect x="160" y="420" width="280" height="70" fill="currentColor" fillOpacity="0.18" stroke="currentColor" />
          <path d="M160 455 L440 455" />
          {/* sleeve drape */}
          <path d="M80 280 Q60 460 80 600" />
          <path d="M520 280 Q540 460 520 600" />
          {/* sakura accents */}
          <g fill="currentColor" fillOpacity="0.25">
            <circle cx="200" cy="300" r="6" />
            <circle cx="240" cy="340" r="4" />
            <circle cx="180" cy="380" r="3" />
            <circle cx="420" cy="320" r="5" />
            <circle cx="460" cy="370" r="4" />
            <circle cx="400" cy="260" r="3" />
          </g>
        </g>
      </svg>

      {/* Soft radial wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
    </div>
  );
}
