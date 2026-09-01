export function LogoMark({ size = 28 }: { size?: number }) {
  const rings = [18, 24, 30, 36, 42, 48];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0f172a" />
      <rect x="18" y="11" width="38" height="42" rx="3" fill="#dce8f5" />
      {[21, 28, 35, 42].map((y) => (
        <line key={y} x1="23" y1={y} x2="52" y2={y} stroke="#b8cfea" strokeWidth="1.1" strokeLinecap="round" />
      ))}
      <text x="24" y="26.5" fontSize="5" fill="#5a7a9a" fontFamily="var(--font-jetbrains), monospace">
        P/E
      </text>
      <text x="37" y="26.5" fontSize="5.2" fill="#10b981" fontWeight="700" fontFamily="var(--font-jetbrains), monospace">
        24×
      </text>
      <path
        d="M 23 42 C 24 44, 28 40, 32 36 C 36 32, 38 27, 42 23 C 44 21, 47 17, 51 14"
        fill="none"
        stroke="#10b981"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="51" cy="14" r="2.8" fill="#10b981" />
      {rings.map((y) => (
        <g key={y}>
          <circle cx="18" cy={y} r="3.4" fill="#dce8f5" />
          <circle cx="18" cy={y} r="3.4" fill="none" stroke="#7a9aba" strokeWidth="1.4" />
          <circle cx="18" cy={y} r="1.5" fill="#0f172a" />
        </g>
      ))}
    </svg>
  );
}
