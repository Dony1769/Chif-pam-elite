/** Emblème FC Career 27 : écusson facetté, ballon stylisé et millésime. */
export function FcEmblem({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" className={className} role="img" aria-label="FC Career 27">
      <defs>
        <linearGradient id="fce-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B6BFF" />
          <stop offset="0.55" stopColor="#1A2FA8" />
          <stop offset="1" stopColor="#0A1460" />
        </linearGradient>
        <linearGradient id="fce-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E4FF8A" />
          <stop offset="1" stopColor="#7FC20F" />
        </linearGradient>
      </defs>
      {/* Tranche (relief) */}
      <path d="M50 8 L90 20 L86 66 Q80 92 50 109 Q20 92 14 66 L10 20 Z" fill="#050B33" transform="translate(0 4)" />
      {/* Contour lime */}
      <path d="M50 4 L92 16 L88 64 Q82 92 50 110 Q18 92 12 64 L8 16 Z" fill="url(#fce-rim)" />
      {/* Face */}
      <path d="M50 10 L86 20.5 L82.5 63 Q77 87 50 103 Q23 87 17.5 63 L14 20.5 Z" fill="url(#fce-face)" />
      {/* Facettes */}
      <path d="M50 10 L86 20.5 L50 52 Z" fill="#ffffff" opacity="0.10" />
      <path d="M14 20.5 L50 52 L17.5 63 Z" fill="#000" opacity="0.12" />
      {/* Ballon */}
      <circle cx="50" cy="44" r="15" fill="#EEF2FF" />
      <path d="M50 35 L58 41 L55 50 L45 50 L42 41 Z" fill="#0A1460" />
      <path d="M50 29 V35 M58 41 L64.5 38.5 M55 50 L59 56 M45 50 L41 56 M42 41 L35.5 38.5" stroke="#0A1460" strokeWidth="2" strokeLinecap="round" />
      {/* Millésime */}
      <text x="50" y="84" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" fill="#B9FF39" letterSpacing="-1">27</text>
      <text x="50" y="68" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="7.5" fill="#EEF2FF" letterSpacing="2">FC CAREER</text>
    </svg>
  );
}
