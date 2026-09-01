import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "../../router";

// ─── Data ─────────────────────────────────────────────────────────────────────

// AAPL NTM Forward P/E history (approximate)
const PE_HISTORY = [
  { year: 2015, pe: 12.5, growth: 7 },
  { year: 2016, pe: 13.8, growth: 15 },
  { year: 2017, pe: 17.4, growth: 12 },
  { year: 2018, pe: 12.8, growth: 29 },
  { year: 2019, pe: 21.3, growth: 12 },
  { year: 2020, pe: 33.4, growth: 10 },
  { year: 2021, pe: 30.1, growth: 71 },
  { year: 2022, pe: 21.6, growth: 9 },
  { year: 2023, pe: 28.8, growth: -3 },   // EPS declined — PEG unavailable
  { year: 2024, pe: 29.2, growth: 12 },
  { year: 2025, pe: 26.1, growth: 10 },   // current
];

const avg5Y  = PE_HISTORY.slice(-6, -1).reduce((s, d) => s + d.pe, 0) / 5;   // 2020-2024
const avg10Y = PE_HISTORY.slice(0, -1).reduce((s, d) => s + d.pe, 0) / 10;   // 2015-2024

const TTM_EPS = 6.43;
const FWD_EPS = 9.38;
const CURRENT_PRICE = 201.32;
const CURRENT_PE = PE_HISTORY[PE_HISTORY.length - 1].pe;

const AI_PEER_SUGGESTIONS = [
  { ticker: "MSFT", name: "Microsoft",  pe: 34.2, peg: 2.2, why: "Similar scale, services + cloud mix" },
  { ticker: "GOOGL", name: "Alphabet",  pe: 20.1, peg: 1.2, why: "Ad-tech moat, cloud compounder" },
  { ticker: "META",  name: "Meta",      pe: 25.3, peg: 1.5, why: "Consumer tech, high FCF margin" },
  { ticker: "AMZN",  name: "Amazon",    pe: 35.4, peg: 1.8, why: "Marketplace + AWS compounder" },
  { ticker: "NVDA",  name: "Nvidia",    pe: 50.1, peg: 1.6, why: "AI hardware, different growth profile" },
];

const PEER_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];

// ─── SVG Chart ────────────────────────────────────────────────────────────────

const VB_W = 600;
const VB_H = 220;
const PAD = { t: 14, r: 16, b: 36, l: 44 };
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;

function xPos(i: number) {
  return PAD.l + (i / (PE_HISTORY.length - 1)) * PLOT_W;
}

function buildChart(
  mode: "pe" | "peg",
  expectedPE: number,
  expectedGrowth: number,
  activePeers: typeof AI_PEER_SUGGESTIONS,
) {
  const vals = mode === "pe"
    ? PE_HISTORY.map(d => d.pe)
    : PE_HISTORY.map(d => (d.growth > 0 ? d.pe / d.growth : null));

  const validVals = vals.filter((v): v is number => v !== null);
  const refLines = mode === "pe"
    ? [avg5Y, avg10Y, expectedPE, ...activePeers.map(p => p.pe)]
    : [1, 2, expectedPE / Math.max(expectedGrowth, 1), ...activePeers.map(p => p.peg)];

  const maxY = Math.max(...validVals, ...refLines.filter(v => !isNaN(v))) * 1.18;
  const minY = 0;

  function yPos(v: number) {
    return PAD.t + PLOT_H - ((v - minY) / (maxY - minY)) * PLOT_H;
  }

  // Build line path (break on null)
  let mainPath = "";
  let segment = "";
  vals.forEach((v, i) => {
    if (v === null) {
      if (segment) mainPath += segment + " ";
      segment = "";
      return;
    }
    const x = xPos(i);
    const y = yPos(v);
    segment += segment === "" ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });
  if (segment) mainPath += segment;

  // Grid Y values
  const gridStep = maxY < 15 ? 2 : maxY < 40 ? 5 : 10;
  const gridYs: number[] = [];
  for (let v = 0; v <= maxY; v += gridStep) gridYs.push(v);

  return { vals, maxY, minY, yPos, mainPath, gridYs };
}

interface ChartProps {
  mode: "pe" | "peg";
  expectedPE: number;
  expectedGrowth: number;
  activePeers: typeof AI_PEER_SUGGESTIONS;
  onHoverYear?: (y: number | null) => void;
}

function PEChart({ mode, expectedPE, expectedGrowth, activePeers }: ChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(
    () => buildChart(mode, expectedPE, expectedGrowth, activePeers),
    [mode, expectedPE, expectedGrowth, activePeers]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VB_W;
    const relX = svgX - PAD.l;
    const idx = Math.round((relX / PLOT_W) * (PE_HISTORY.length - 1));
    setHoverIdx(Math.min(Math.max(idx, 0), PE_HISTORY.length - 1));
  }, []);

  const mainColor = mode === "pe" ? "#3b82f6" : "#8b5cf6";

  const expectedVal = mode === "pe" ? expectedPE : expectedPE / Math.max(expectedGrowth, 1);
  const expY = chart.yPos(expectedVal);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Grid lines */}
      {chart.gridYs.map(v => {
        const y = chart.yPos(v);
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={VB_W - PAD.r} y2={y}
              stroke="#f1f5f9" strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={PAD.l - 6} y={y + 3.5}
              fontSize={8.5} fill="#94a3b8" textAnchor="end"
              fontFamily="'JetBrains Mono', monospace">
              {v}{mode === "pe" ? "x" : ""}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {PE_HISTORY.map((d, i) => {
        if (i % 2 !== 0 && i !== PE_HISTORY.length - 1) return null;
        return (
          <text key={d.year} x={xPos(i)} y={VB_H - PAD.b + 14}
            fontSize={9} fill="#94a3b8" textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace">
            {d.year}
          </text>
        );
      })}

      {/* Reference lines */}
      {mode === "pe" && (
        <>
          {/* 10Y avg */}
          <line x1={PAD.l} y1={chart.yPos(avg10Y)} x2={VB_W - PAD.r} y2={chart.yPos(avg10Y)}
            stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 4" />
          {/* 5Y avg */}
          <line x1={PAD.l} y1={chart.yPos(avg5Y)} x2={VB_W - PAD.r} y2={chart.yPos(avg5Y)}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="6 3" />
        </>
      )}
      {mode === "peg" && (
        <>
          <line x1={PAD.l} y1={chart.yPos(1)} x2={VB_W - PAD.r} y2={chart.yPos(1)}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
          <line x1={PAD.l} y1={chart.yPos(2)} x2={VB_W - PAD.r} y2={chart.yPos(2)}
            stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 4" />
        </>
      )}

      {/* Expected P/E / PEG line */}
      {!isNaN(expY) && expY > PAD.t && expY < VB_H - PAD.b && (
        <line x1={PAD.l} y1={expY} x2={VB_W - PAD.r} y2={expY}
          stroke="#10b981" strokeWidth={2} strokeDasharray="none" />
      )}

      {/* Peer P/E dots (at current year x) */}
      {activePeers.map((peer, pi) => {
        const val = mode === "pe" ? peer.pe : peer.peg;
        const y = chart.yPos(val);
        if (y < PAD.t || y > VB_H - PAD.b) return null;
        const x = xPos(PE_HISTORY.length - 1) + 18;
        return (
          <g key={peer.ticker}>
            <circle cx={x} cy={y} r={4} fill={PEER_COLORS[pi % PEER_COLORS.length]} />
            <text x={x + 7} y={y + 3.5} fontSize={8} fill={PEER_COLORS[pi % PEER_COLORS.length]}
              fontFamily="'Inter', sans-serif" fontWeight="700">{peer.ticker}</text>
          </g>
        );
      })}

      {/* Main AAPL line */}
      <path d={chart.mainPath} fill="none" stroke={mainColor} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots on line */}
      {PE_HISTORY.map((d, i) => {
        const val = mode === "pe" ? d.pe : (d.growth > 0 ? d.pe / d.growth : null);
        if (val === null) return null;
        const y = chart.yPos(val);
        const isLast = i === PE_HISTORY.length - 1;
        return (
          <circle key={d.year} cx={xPos(i)} cy={y} r={isLast ? 5 : 3}
            fill={isLast ? mainColor : "white"}
            stroke={mainColor} strokeWidth={isLast ? 0 : 1.5} />
        );
      })}

      {/* Hover vertical line + tooltip */}
      {hoverIdx !== null && (() => {
        const d = PE_HISTORY[hoverIdx];
        const val = mode === "pe" ? d.pe : (d.growth > 0 ? d.pe / d.growth : null);
        const x = xPos(hoverIdx);
        return (
          <g>
            <line x1={x} y1={PAD.t} x2={x} y2={VB_H - PAD.b}
              stroke="#e2e8f0" strokeWidth={1} />
            {val !== null && (
              <g>
                <circle cx={x} cy={chart.yPos(val)} r={5}
                  fill="white" stroke={mainColor} strokeWidth={2} />
                <rect
                  x={Math.min(x + 6, VB_W - PAD.r - 80)}
                  y={chart.yPos(val) - 22}
                  width={76} height={20} rx={4}
                  fill="white" stroke="#e2e8f0" strokeWidth={1}
                  filter="url(#shadow)" />
                <text
                  x={Math.min(x + 6, VB_W - PAD.r - 80) + 8}
                  y={chart.yPos(val) - 8}
                  fontSize={9} fill="#334155"
                  fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                  {d.year}: {val.toFixed(1)}{mode === "pe" ? "x" : ""}
                </text>
              </g>
            )}
            {val === null && (
              <text x={x} y={PAD.t + 10} fontSize={8} fill="#94a3b8"
                textAnchor="middle" fontFamily="'Inter', sans-serif">
                N/A
              </text>
            )}
          </g>
        );
      })()}

      {/* Legend */}
      <g transform={`translate(${PAD.l}, ${VB_H - 6})`}>
        {mode === "pe" ? (
          <g fontFamily="'Inter', sans-serif" fontSize={8.5}>
            <circle cx={4} cy={-2} r={3} fill={mainColor} />
            <text x={10} y={1} fill="#64748b">AAPL P/E</text>
            <line x1={68} y1={-2} x2={82} y2={-2} stroke="#94a3b8" strokeDasharray="5 3" strokeWidth={1.5} />
            <text x={86} y={1} fill="#94a3b8">5Y avg {avg5Y.toFixed(1)}x</text>
            <line x1={148} y1={-2} x2={162} y2={-2} stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth={1} />
            <text x={166} y={1} fill="#94a3b8">10Y avg {avg10Y.toFixed(1)}x</text>
            <line x1={234} y1={-2} x2={248} y2={-2} stroke="#10b981" strokeWidth={2} />
            <text x={252} y={1} fill="#10b981">Expected</text>
          </g>
        ) : (
          <g fontFamily="'Inter', sans-serif" fontSize={8.5}>
            <circle cx={4} cy={-2} r={3} fill={mainColor} />
            <text x={10} y={1} fill="#64748b">AAPL PEG</text>
            <line x1={68} y1={-2} x2={82} y2={-2} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
            <text x={86} y={1} fill="#b45309">PEG = 1</text>
            <line x1={136} y1={-2} x2={150} y2={-2} stroke="#10b981" strokeWidth={2} />
            <text x={154} y={1} fill="#10b981">Expected PEG</text>
          </g>
        )}
      </g>

      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1" />
        </filter>
      </defs>
    </svg>
  );
}

// ─── Peer section ─────────────────────────────────────────────────────────────

function PeerSection({
  mode,
  activePeers,
  onTogglePeer,
  peerStatus,
  onSuggest,
  onUsePeerMedian,
}: {
  mode: "pe" | "peg";
  activePeers: typeof AI_PEER_SUGGESTIONS;
  onTogglePeer: (p: (typeof AI_PEER_SUGGESTIONS)[0]) => void;
  peerStatus: "idle" | "loading" | "suggested";
  onSuggest: () => void;
  onUsePeerMedian: (pe: number) => void;
}) {
  const [manualTicker, setManualTicker] = useState("");

  const activeTickers = new Set(activePeers.map(p => p.ticker));

  const peerMedianPE = useMemo(() => {
    if (activePeers.length === 0) return null;
    const sorted = [...activePeers].sort((a, b) => a.pe - b.pe);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid].pe : (sorted[mid - 1].pe + sorted[mid].pe) / 2;
  }, [activePeers]);

  const peerMedianPEG = useMemo(() => {
    if (activePeers.length === 0) return null;
    const sorted = [...activePeers].sort((a, b) => a.peg - b.peg);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid].peg : (sorted[mid - 1].peg + sorted[mid].peg) / 2;
  }, [activePeers]);

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 px-[16px] md:px-[20px] py-[16px]">
      <div className="flex items-center justify-between mb-[12px] flex-wrap gap-[8px]">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[13px] font-bold text-slate-900">
            Peers for comparison
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400 mt-[1px]">
            Added peers appear on chart · AI suggests; you confirm
          </p>
        </div>
        <button
          onClick={onSuggest}
          disabled={peerStatus === "loading"}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-[7px] text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed border-0 bg-transparent"
        >
          {peerStatus === "loading" ? (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" className="animate-spin">
                <circle cx="5.5" cy="5.5" r="4" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="20" strokeLinecap="round" fill="none" />
              </svg>
              Suggesting…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1.5v1M5.5 8.5v1M1.5 5.5h1M8.5 5.5h1M2.7 2.7l.7.7M7.6 7.6l.7.7M7.6 3.4l-.7.7M3.4 7.6l-.7.7" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {peerStatus === "suggested" ? "Re-suggest" : "Suggest peers (AI)"}
            </>
          )}
        </button>
      </div>

      {/* AI suggested peer chips */}
      {peerStatus === "suggested" && (
        <div className="flex flex-col gap-[4px] mb-[12px]">
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 mb-[4px]">
            AI suggestions — click + to add
          </p>
          {AI_PEER_SUGGESTIONS.map((p, pi) => (
            <div key={p.ticker}
              className="flex items-center gap-[10px] rounded-[8px] bg-slate-50 border border-slate-100 px-[12px] py-[8px]">
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className="text-[12px] font-bold text-slate-800 w-[44px] shrink-0">{p.ticker}</span>
              <div className="flex-1 min-w-0">
                <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500 leading-snug">{p.why}</span>
              </div>
              <div className="flex items-center gap-[10px] shrink-0">
                <div className="text-right">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="text-[11px] font-semibold text-slate-700 tabular-nums">
                    P/E {p.pe}x
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif" }}
                    className="text-[10px] text-slate-400 ml-[6px]">PEG {p.peg}</span>
                </div>
                <button
                  onClick={() => onTogglePeer(p)}
                  className={`size-[22px] rounded-[5px] border flex items-center justify-center cursor-pointer transition-colors ${
                    activeTickers.has(p.ticker)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-300 text-slate-500 hover:border-blue-400"}`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    {activeTickers.has(p.ticker)
                      ? <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      : <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active peers table + median */}
      {activePeers.length > 0 && (
        <div className="mt-[8px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <div className="h-px flex-1 bg-slate-100" />
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">Active peers</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="rounded-[8px] border border-slate-100 overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[320px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Ticker", "Current P/E", "PEG", ""].map(h => (
                    <th key={h} className="px-[12px] py-[6px]">
                      <span style={{ fontFamily: "'Inter', sans-serif" }}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activePeers.map((p, pi) => (
                  <tr key={p.ticker} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-[12px] py-[7px]">
                      <div className="flex items-center gap-[6px]">
                        <div className="size-[7px] rounded-full shrink-0"
                          style={{ backgroundColor: PEER_COLORS[pi % PEER_COLORS.length] }} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          className="text-[12px] font-bold text-slate-800">{p.ticker}</span>
                      </div>
                    </td>
                    <td className="px-[12px] py-[7px]">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        className="text-[12px] font-semibold text-slate-700 tabular-nums">{p.pe}x</span>
                    </td>
                    <td className="px-[12px] py-[7px]">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        className="text-[12px] text-slate-500 tabular-nums">{p.peg}</span>
                    </td>
                    <td className="px-[12px] py-[7px]">
                      <button onClick={() => onTogglePeer(p)}
                        style={{ fontFamily: "'Inter', sans-serif" }}
                        className="text-[10px] text-slate-400 hover:text-red-500 border-0 bg-transparent cursor-pointer p-0 transition-colors">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Median row */}
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="px-[12px] py-[7px]">
                    <span style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[11px] font-bold text-slate-600">Peer median</span>
                  </td>
                  <td className="px-[12px] py-[7px]">
                    <div className="flex items-center gap-[8px]">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        className="text-[12px] font-bold text-slate-800 tabular-nums">
                        {peerMedianPE?.toFixed(1)}x
                      </span>
                      <button onClick={() => peerMedianPE && onUsePeerMedian(peerMedianPE)}
                        style={{ fontFamily: "'Inter', sans-serif" }}
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold border border-blue-200 rounded-[5px] px-[6px] py-[2px] bg-blue-50 cursor-pointer transition-colors">
                        Use
                      </button>
                    </div>
                  </td>
                  <td className="px-[12px] py-[7px]">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[12px] font-semibold text-slate-600 tabular-nums">
                      {peerMedianPEG?.toFixed(1)}
                    </span>
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick-fill buttons */}
          <div className="flex items-center gap-[6px] mt-[8px] flex-wrap">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">Quick fill →</span>
            {[
              { label: `5Y avg ${avg5Y.toFixed(1)}x`, val: avg5Y },
              { label: `10Y avg ${avg10Y.toFixed(1)}x`, val: avg10Y },
              { label: `Current ${CURRENT_PE}x`, val: CURRENT_PE },
            ].map(b => (
              <button key={b.label} onClick={() => onUsePeerMedian(b.val)}
                style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border-0 cursor-pointer px-[8px] py-[4px] rounded-[6px] transition-colors">
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual add */}
      <div className="flex items-center gap-[6px] mt-[12px]">
        <input
          type="text"
          value={manualTicker}
          onChange={e => setManualTicker(e.target.value.toUpperCase())}
          placeholder="Add ticker…"
          maxLength={6}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className="flex-1 text-[12px] px-[10px] py-[6px] rounded-[7px] border border-slate-200 outline-none focus:border-blue-400 bg-white text-slate-800 placeholder-slate-300"
        />
        <button
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="px-[10px] py-[6px] text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[7px] border-0 cursor-pointer transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Right rail ───────────────────────────────────────────────────────────────

function RightRail({
  expectedPE,
  onExpectedPE,
  epsBasis,
  onEpsBasis,
  expectedGrowth,
  onExpectedGrowth,
  mode,
  myFairValue,
  onSetFV,
  onUseInDecision,
  usedInDecision,
  onUse5Yavg,
}: {
  expectedPE: number;
  onExpectedPE: (v: number) => void;
  epsBasis: "ttm" | "fwd";
  onEpsBasis: (v: "ttm" | "fwd") => void;
  expectedGrowth: number;
  onExpectedGrowth: (v: number) => void;
  mode: "pe" | "peg";
  myFairValue: number | null;
  onSetFV: () => void;
  onUseInDecision: () => void;
  usedInDecision: boolean;
  onUse5Yavg: () => void;
}) {
  const eps        = epsBasis === "ttm" ? TTM_EPS : FWD_EPS;
  const fairValue  = expectedPE * eps;
  const mos        = ((fairValue - CURRENT_PRICE) / CURRENT_PRICE) * 100;
  const currentPEG = CURRENT_PE / Math.max(expectedGrowth, 0.1);
  const pegAtExp   = expectedPE / Math.max(expectedGrowth, 0.1);
  const impliedPE1 = 1 * expectedGrowth;
  const impliedPE2 = 2 * expectedGrowth;
  const pos        = mos >= 0;

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Expected P/E + Fair Value — side by side on mobile, stacked on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-1 gap-[10px]">
      {/* Expected P/E */}
      <div className="bg-white rounded-[14px] border border-slate-100 px-[14px] md:px-[18px] py-[14px] md:py-[16px]">
        <div className="flex items-center justify-between mb-[10px]">
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-bold text-slate-900">Expected P/E</p>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 mt-[1px]">Your judgment multiple</p>
          </div>
          <button onClick={onUse5Yavg}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 border border-dashed border-slate-200 hover:border-blue-400 rounded-[6px] px-[7px] py-[4px] bg-transparent cursor-pointer transition-colors">
            5Y avg
          </button>
        </div>

        <div className="flex items-center gap-[6px] rounded-[10px] border-2 border-slate-200 focus-within:border-blue-400 px-[14px] py-[8px] bg-white transition-colors">
          <input
            type="number"
            value={expectedPE}
            min={1} max={200} step={0.5}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onExpectedPE(Math.min(200, Math.max(1, v))); }}
            className="flex-1 bg-transparent border-0 outline-none text-[32px] font-bold text-slate-900 tabular-nums p-0"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[18px] text-slate-400 font-semibold">×</span>
        </div>

        {/* EPS toggle */}
        <div className="mt-[10px]">
          <div className="flex items-center justify-between mb-[5px]">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">EPS</span>
            <div className="flex items-center bg-slate-100 rounded-[6px] p-[2px]">
              {(["ttm", "fwd"] as const).map(b => (
                <button key={b} onClick={() => onEpsBasis(b)}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  className={`px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold border-0 cursor-pointer transition-colors ${
                    epsBasis === b ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500"}`}>
                  {b === "ttm" ? "TTM" : "Forward"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-[10px] py-[6px] rounded-[7px] bg-slate-50 border border-slate-100">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">
              {epsBasis === "ttm" ? "TTM EPS (actual)" : "Forward EPS (NTM est.)"}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[13px] font-bold text-slate-800 tabular-nums">
              ${eps.toFixed(2)}
            </span>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 mt-[5px] text-center">
            Fair Value = {expectedPE}× × ${eps.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Fair Value output */}
      <div className={`rounded-[14px] border px-[14px] md:px-[18px] py-[14px] md:py-[16px] ${pos ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
        <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fair Value / Share</span>
        <div className="mt-[6px]">
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
            className={`text-[32px] md:text-[48px] font-bold tabular-nums leading-none block ${pos ? "text-emerald-700" : "text-red-500"}`}>
            ${fairValue.toFixed(2)}
          </span>
        </div>
        <div className="mt-[8px] flex flex-col gap-[4px]">
          <div className="flex items-center justify-between px-[8px] md:px-[10px] py-[5px] md:py-[6px] bg-white rounded-[7px]">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] md:text-[11px] text-slate-500">Current price</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] md:text-[12px] font-semibold text-slate-700 tabular-nums">${CURRENT_PRICE}</span>
          </div>
          <div className={`flex items-center justify-between px-[8px] md:px-[10px] py-[6px] md:py-[7px] rounded-[7px] ${pos ? "bg-emerald-100" : "bg-red-100"}`}>
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className={`text-[10px] md:text-[11px] font-bold ${pos ? "text-emerald-700" : "text-red-600"}`}>MOS</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className={`text-[13px] md:text-[14px] font-bold tabular-nums ${pos ? "text-emerald-600" : "text-red-500"}`}>
              {mos >= 0 ? "+" : ""}{mos.toFixed(1)}%
            </span>
          </div>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif" }}
          className={`text-[10px] md:text-[11px] font-semibold mt-[6px] md:mt-[8px] leading-snug ${pos ? "text-emerald-700" : "text-red-600"}`}>
          {pos
            ? `${mos.toFixed(1)}% below fair value`
            : `${Math.abs(mos).toFixed(1)}% above fair value`}
        </p>
      </div>
      </div>{/* end 2-col grid */}

      {/* PEG companion — hidden on mobile to reduce scroll depth */}
      <div className="hidden md:block bg-white rounded-[14px] border border-slate-100 px-[18px] py-[14px]">
        <div className="flex items-center justify-between mb-[10px]">
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-bold text-slate-900">PEG</p>
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">growth-adjusted lens</span>
        </div>

        <div className="flex flex-col gap-[5px]">
          <div className="flex items-center gap-[4px] rounded-[7px] border border-slate-200 focus-within:border-blue-300 px-[10px] py-[6px] bg-white">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 shrink-0">Expected growth</span>
            <input
              type="number" value={expectedGrowth} min={0.1} max={100} step={0.5}
              onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onExpectedGrowth(Math.max(0.1, v)); }}
              className="flex-1 bg-transparent border-0 outline-none text-[13px] font-bold text-slate-900 tabular-nums p-0 text-right"
              style={{ fontFamily: "'JetBrains Mono', monospace" }} />
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 shrink-0">%</span>
          </div>

          <div className="flex flex-col gap-[3px] mt-[4px]">
            {[
              { label: "Current PEG",        val: currentPEG.toFixed(2), note: `${CURRENT_PE}x ÷ ${expectedGrowth}%` },
              { label: "PEG at expected P/E", val: pegAtExp.toFixed(2),  note: `${expectedPE}x ÷ ${expectedGrowth}%`, highlight: true },
            ].map(r => (
              <div key={r.label}
                className={`flex items-center justify-between px-[10px] py-[6px] rounded-[7px] ${r.highlight ? "bg-slate-50 border border-slate-100" : ""}`}>
                <div>
                  <span style={{ fontFamily: "'Inter', sans-serif" }}
                    className={`text-[11px] ${r.highlight ? "font-bold text-slate-700" : "text-slate-500"}`}>{r.label}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[9px] text-slate-400">{r.note}</p>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className={`text-[13px] font-bold tabular-nums ${r.highlight ? "text-slate-900" : "text-slate-600"}`}>
                  {r.val}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-[6px] pt-[8px] border-t border-slate-100">
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 mb-[5px]">
              Implied P/E at target PEG:
            </p>
            <div className="flex gap-[5px]">
              {[{ label: "PEG=1", val: impliedPE1.toFixed(1) }, { label: "PEG=2", val: impliedPE2.toFixed(1) }].map(b => (
                <button key={b.label} onClick={() => onExpectedPE(parseFloat(b.val))}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  className="flex-1 flex flex-col items-center py-[6px] rounded-[7px] bg-slate-50 border border-slate-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                  <span className="text-[9px] text-slate-400">{b.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="text-[12px] font-bold text-slate-800">{b.val}×</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-[6px] md:flex-col grid grid-cols-2 md:grid-cols-1">
        <button onClick={onSetFV}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="py-[9px] rounded-[9px] text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer transition-colors">
          Set Fair Value
        </button>
        <button onClick={onUseInDecision}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className={`py-[9px] rounded-[9px] text-[12px] font-bold border-0 cursor-pointer transition-colors ${
            usedInDecision ? "bg-blue-100 text-blue-700" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
          {usedInDecision ? "Returning…" : "Use in decision"}
        </button>
      </div>
    </div>
  );
}

// ─── Main PEView ──────────────────────────────────────────────────────────────

export interface PEViewProps {
  myFairValue: number | null;
  onSetFV: (fv: number) => void;
  onUseInDecision: () => void;
  usedInDecision: boolean;
}

export default function PEView({ myFairValue, onSetFV, onUseInDecision, usedInDecision }: PEViewProps) {
  const [chartMode, setChartMode]       = useState<"pe" | "peg">("pe");
  const [expectedPE, setExpectedPE]     = useState(24.0);
  const [epsBasis, setEpsBasis]         = useState<"ttm" | "fwd">("fwd");
  const [expectedGrowth, setGrowth]     = useState(10.0);
  const [peerStatus, setPeerStatus]     = useState<"idle" | "loading" | "suggested">("idle");
  const [activePeers, setActivePeers]   = useState<typeof AI_PEER_SUGGESTIONS>([]);

  function suggestPeers() {
    setPeerStatus("loading");
    setTimeout(() => setPeerStatus("suggested"), 1400);
  }

  function togglePeer(p: typeof AI_PEER_SUGGESTIONS[0]) {
    setActivePeers(prev =>
      prev.find(x => x.ticker === p.ticker)
        ? prev.filter(x => x.ticker !== p.ticker)
        : [...prev, p]
    );
  }

  const eps       = epsBasis === "ttm" ? TTM_EPS : FWD_EPS;
  const fairValue = expectedPE * eps;

  return (
    <div className="flex flex-col md:flex-row gap-[12px] md:gap-[16px] items-start">
      {/* Left: Chart + Peers — below rail on mobile, left column on desktop */}
      <div className="order-last md:order-first flex-1 min-w-0 flex flex-col gap-[12px]">
        {/* Wisdom quote */}
        <div className="rounded-[12px] border-l-4 border-blue-200 bg-white px-[16px] md:px-[20px] py-[12px] md:py-[14px]">
          <p style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[15px] text-slate-700 leading-relaxed italic">
            "市盈率单独看没有意义；只有和自身历史、同业与成长性对比时，才有参考价值。"
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[11px] text-slate-400 mt-[6px] not-italic">
            A P/E ratio means little in isolation — it becomes useful only when compared with a company's history, peers, and growth.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[10px] text-slate-400 mt-[3px]">
            — inspired by <span className="italic">The Five Rules for Successful Stock Investing</span> (《股市真规则》)
          </p>
        </div>

        {/* Chart card */}
        <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-[16px] md:px-[20px] py-[12px] md:py-[14px] border-b border-slate-100 flex-wrap gap-[8px]">
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[13px] font-bold text-slate-900">
                {chartMode === "pe" ? "10-Year P/E vs references" : "10-Year PEG vs peers & growth"}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400 mt-[1px]">
                AAPL · forward P/E · {activePeers.length > 0 ? `${activePeers.length} peer${activePeers.length > 1 ? "s" : ""} added` : "no peers yet"}
              </p>
            </div>
            {/* Chart toggle */}
            <div className="flex items-center bg-slate-100 rounded-[8px] p-[3px] shrink-0">
              {(["pe", "peg"] as const).map(m => (
                <button key={m} onClick={() => setChartMode(m)}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  className={`px-[12px] py-[5px] rounded-[6px] text-[12px] font-bold border-0 cursor-pointer transition-colors ${
                    chartMode === m ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500 hover:text-slate-700"}`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="px-[8px] py-[12px]">
            <PEChart
              mode={chartMode}
              expectedPE={expectedPE}
              expectedGrowth={expectedGrowth}
              activePeers={activePeers}
            />
          </div>

          {/* Chart notes */}
          <div className="px-[16px] md:px-[20px] pb-[12px] flex items-center gap-[10px] md:gap-[16px] flex-wrap">
            {chartMode === "pe" && (
              <>
                <div className="flex items-center gap-[5px]">
                  <div className="w-[16px] h-[2px] bg-emerald-500" />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-500">
                    Expected {expectedPE}×
                  </span>
                </div>
                <div className="flex items-center gap-[5px]">
                  <div className="w-[16px] h-[1.5px] bg-slate-300" style={{ backgroundImage: "repeating-linear-gradient(90deg,#94a3b8 0,#94a3b8 6px,transparent 6px,transparent 9px)" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">
                    5Y avg {avg5Y.toFixed(1)}×
                  </span>
                </div>
                <div className="flex items-center gap-[5px]">
                  <div className="w-[16px] h-[1px] bg-slate-300" style={{ backgroundImage: "repeating-linear-gradient(90deg,#cbd5e1 0,#cbd5e1 3px,transparent 3px,transparent 7px)" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">
                    10Y avg {avg10Y.toFixed(1)}×
                  </span>
                </div>
              </>
            )}
            {chartMode === "peg" && (
              <>
                <div className="flex items-center gap-[5px]">
                  <div className="w-[16px] h-[1.5px] bg-amber-400" style={{ backgroundImage: "repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 4px,transparent 4px,transparent 7px)" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">PEG = 1 (growth-fair)</span>
                </div>
                <div className="flex items-center gap-[5px]">
                  <div className="w-[16px] h-[2px] bg-emerald-500" />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-500">
                    PEG at expected P/E
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Peer section */}
        <PeerSection
          mode={chartMode}
          activePeers={activePeers}
          onTogglePeer={togglePeer}
          peerStatus={peerStatus}
          onSuggest={suggestPeers}
          onUsePeerMedian={v => setExpectedPE(parseFloat(v.toFixed(1)))}
        />
      </div>

      {/* Right rail — appears first on mobile so inputs + FV output are immediately visible */}
      <div className="order-first md:order-last w-full md:w-[288px] md:shrink-0 md:sticky md:top-[120px]">
        <RightRail
          expectedPE={expectedPE}
          onExpectedPE={setExpectedPE}
          epsBasis={epsBasis}
          onEpsBasis={setEpsBasis}
          expectedGrowth={expectedGrowth}
          onExpectedGrowth={setGrowth}
          mode={chartMode}
          myFairValue={myFairValue}
          onSetFV={() => onSetFV(parseFloat(fairValue.toFixed(2)))}
          onUseInDecision={onUseInDecision}
          usedInDecision={usedInDecision}
          onUse5Yavg={() => setExpectedPE(parseFloat(avg5Y.toFixed(1)))}
        />
      </div>
    </div>
  );
}
