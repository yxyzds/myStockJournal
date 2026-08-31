// Logo showcase — MyStockJournal

// ─── Mark ─────────────────────────────────────────────────────────────────────
//
// Spiral-bound notebook on dark tile.
// Page is light (cool paper white) with a drop shadow so it sits on the surface
// rather than floating. Only one annotation: "P/E 24×" on the middle ruled line.
// The emerald line starts on the bottom rule, dips at pen-touch, then rises.

const RING_YS = [18, 24, 30, 36, 42, 48];

function LogoMark({
  size = 64,
  tile = true,
  tileRadius = 14,
  variant = "dark",
}: {
  size?: number;
  tile?: boolean;
  tileRadius?: number;
  variant?: "dark" | "light";
}) {
  const isDark   = variant === "dark";
  const tileBg   = isDark ? "#0f172a" : "#f1f5f9";
  const pageBg   = isDark ? "#dce8f5" : "#ffffff";
  const ruleCl   = isDark ? "#b8cfea" : "#e2e8f0";
  const ringHole = tileBg;
  const ringWire = isDark ? "#7a9aba" : "#94a3b8";
  const labelCl  = isDark ? "#5a7a9a" : "#94a3b8";
  const valCl    = "#10b981";
  const lineCl   = "#10b981";

  // shadow filter id must be unique per variant to avoid collisions
  const filterId = `ps-${variant}`;

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="-1" dy="2" stdDeviation="2.5"
            floodColor="#000000" floodOpacity={isDark ? "0.35" : "0.12"} />
        </filter>
      </defs>

      {/* Tile */}
      {tile && <rect width="64" height="64" rx={tileRadius} fill={tileBg} />}

      {/* Notebook page — light surface with shadow to lift off tile */}
      <rect
        x="18" y="11" width="38" height="42" rx="3"
        fill={pageBg}
        filter={`url(#${filterId})`}
      />

      {/* Four ruled lines */}
      {[21, 28, 35, 42].map(y => (
        <line key={y} x1="23" y1={y} x2="52" y2={y}
          stroke={ruleCl} strokeWidth="1.1" strokeLinecap="round" />
      ))}

      {/* Single annotation on line 2: "P/E" label + "24×" value */}
      <text
        x="24" y="26.5"
        fontSize="5"
        fill={labelCl}
        fontFamily="'JetBrains Mono', 'Courier New', monospace"
        letterSpacing="0.2"
      >
        P/E
      </text>
      <text
        x="37" y="26.5"
        fontSize="5.2"
        fill={valCl}
        fontWeight="700"
        fontFamily="'JetBrains Mono', 'Courier New', monospace"
      >
        24×
      </text>

      {/*
        Handwritten-feel rising line.
        Starts on bottom rule (y=42), dips at pen-touch, then curves
        through all ruled lines and breaks out above the top rule.
      */}
      <path
        d="M 23 42 C 24 44, 28 40, 32 36 C 36 32, 38 27, 42 23 C 44 21, 47 17, 51 14"
        fill="none"
        stroke={lineCl}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Terminal dot */}
      <circle cx="51" cy="14" r="2.8" fill={lineCl} />

      {/* Origin mark */}
      <circle cx="23" cy="42" r="1.8" fill={lineCl} opacity="0.25" />

      {/* Spiral binding rings */}
      {RING_YS.map(y => (
        <g key={y}>
          {/* Ring disc (paper around the hole) */}
          <circle cx="18" cy={y} r="3.4" fill={pageBg} />
          {/* Wire coil */}
          <circle cx="18" cy={y} r="3.4" fill="none" stroke={ringWire} strokeWidth="1.4" />
          {/* Hole — shows tile through */}
          <circle cx="18" cy={y} r="1.5" fill={ringHole} />
        </g>
      ))}
    </svg>
  );
}

// ─── Wordmark ─────────────────────────────────────────────────────────────────

function WordmarkInline({
  markSize = 40,
  variant = "dark",
  textClass = "text-white",
}: {
  markSize?: number;
  variant?: "dark" | "light";
  textClass?: string;
}) {
  return (
    <div className="flex items-center gap-[12px]">
      <LogoMark size={markSize} tile={false} variant={variant} />
      <span
        style={{ fontFamily: "'Playfair Display', serif" }}
        className={`text-[22px] font-bold tracking-tight leading-none ${textClass}`}
      >
        MyStockJournal
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Swatch({ label, bg, children }: { label: string; bg: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[10px] items-center">
      <div className="rounded-[16px] flex items-center justify-center"
        style={{ background: bg, width: 160, height: 160 }}>
        {children}
      </div>
      <span style={{ fontFamily: "'Inter', sans-serif" }}
        className="text-[11px] text-slate-400 text-center">{label}</span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-[16px] w-full">
      <div className="h-px flex-1 bg-slate-100" />
      <span style={{ fontFamily: "'Inter', sans-serif" }}
        className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogoPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white border-b border-slate-100 px-8 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-[8px]">
          <LogoMark size={28} tile={false} variant="light" />
          <span style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[15px] font-semibold text-slate-900">
            MyStockJournal · Brand
          </span>
        </div>
        <span style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          Logo showcase
        </span>
      </header>

      <main className="flex-1 max-w-[820px] mx-auto w-full px-8 py-16 flex flex-col gap-[56px]">

        {/* Title + concept */}
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[40px] font-bold text-slate-900 leading-tight mb-5">
            MyStockJournal
          </h1>
          <div className="bg-white rounded-[12px] border border-slate-100 border-l-4 border-l-slate-300 px-[20px] py-[14px]">
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[13px] text-slate-600 leading-relaxed">
              <strong>Concept:</strong> A spiral-bound notebook (left coil rings) on a dark tile.
              The page lifts off the surface via a drop shadow — clearly physical, not a floating
              rectangle. One annotation on the middle ruled line: <strong>P/E 24×</strong>.
              The emerald line starts on the bottom rule, dips at pen-touch, then rises through
              all rules — the journal entry becoming an insight.
            </p>
          </div>
        </div>

        {/* App icon */}
        <section className="flex flex-col gap-[24px]">
          <Divider label="App icon" />
          <div className="flex flex-wrap gap-[32px] items-end justify-center">
            <Swatch label="Large · dark" bg="#1e2a3a">
              <LogoMark size={120} variant="dark" tileRadius={26} />
            </Swatch>
            <Swatch label="64px · dark" bg="#1e2a3a">
              <LogoMark size={64} variant="dark" />
            </Swatch>
            <Swatch label="64px · light" bg="#e2e8f0">
              <LogoMark size={64} variant="light" />
            </Swatch>
          </div>

          {/* Scale floor */}
          <div className="bg-white rounded-[12px] border border-slate-100 px-[24px] py-[20px]">
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-[16px]">
              Scale floor — notebook silhouette holds, P/E fades gracefully
            </p>
            <div className="flex items-end gap-[28px]">
              {[48, 32, 24, 16].map(s => (
                <div key={s} className="flex flex-col items-center gap-[8px]">
                  <LogoMark size={s} variant="dark" tileRadius={Math.round(s * 0.22)} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="text-[10px] text-slate-400">{s}px</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wordmark */}
        <section className="flex flex-col gap-[14px]">
          <Divider label="Wordmark" />

          <div className="rounded-[12px] px-[32px] py-[28px] flex items-center justify-center"
            style={{ background: "#0f172a" }}>
            <WordmarkInline markSize={44} variant="dark" textClass="text-white" />
          </div>

          <div className="bg-white rounded-[12px] border border-slate-100 px-[32px] py-[28px] flex items-center justify-center">
            <WordmarkInline markSize={44} variant="light" textClass="text-slate-900" />
          </div>
        </section>

        {/* Nav context */}
        <section className="flex flex-col gap-[14px]">
          <Divider label="In-app context" />

          <div className="bg-white rounded-[12px] border border-slate-100 overflow-hidden shadow-sm">
            <div className="h-14 px-6 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-[8px]">
                <LogoMark size={28} tile={false} variant="light" />
                <span style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-[15px] font-semibold text-slate-900 tracking-tight">
                  MyStockJournal
                </span>
              </div>
              <div className="size-8 rounded-full bg-slate-900 flex items-center justify-center">
                <span style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-white text-[11px] font-semibold">AM</span>
              </div>
            </div>
            <div className="px-6 py-10 flex items-center justify-center">
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[12px] text-slate-300">page content</span>
            </div>
          </div>

          {/* Browser tab */}
          <div className="bg-white rounded-[12px] border border-slate-100 px-[24px] py-[20px]">
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-[14px]">
              Browser tab · favicon
            </p>
            <div className="flex items-end">
              <div className="flex items-center gap-[6px] bg-white rounded-t-[7px] border-t border-l border-r border-slate-200 px-[10px] py-[7px]">
                <LogoMark size={16} variant="dark" tileRadius={3} />
                <span style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-[12px] text-slate-700 max-w-[120px] truncate">
                  MyStockJournal
                </span>
                <span className="text-[11px] text-slate-400 ml-2">×</span>
              </div>
              <div className="flex items-center gap-[6px] bg-slate-100 rounded-t-[7px] border-t border-l border-r border-slate-200 px-[10px] py-[7px] opacity-40">
                <div className="size-[16px] rounded-[3px] bg-slate-300" />
                <span style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-[12px] text-slate-500">New Tab</span>
              </div>
            </div>
            <div className="h-[2px] bg-slate-200" />
          </div>
        </section>

        {/* Color tokens */}
        <section className="flex flex-col gap-[16px]">
          <Divider label="Color tokens" />
          <div className="grid grid-cols-4 gap-[12px]">
            {[
              { name: "Slate 900",   hex: "#0f172a", token: "Tile background" },
              { name: "Paper blue",  hex: "#dce8f5", token: "Page surface" },
              { name: "Emerald 500", hex: "#10b981", token: "Chart line · P/E value" },
              { name: "Slate 500",   hex: "#7a9aba", token: "Spiral rings" },
            ].map(c => (
              <div key={c.hex} className="flex flex-col gap-[8px]">
                <div className="h-[44px] rounded-[8px] border border-slate-100"
                  style={{ background: c.hex }} />
                <p style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-[12px] font-semibold text-slate-800">{c.name}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-[11px] text-slate-400">{c.hex}</p>
                <p style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-[10px] text-slate-400">{c.token}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
