"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { pegSeries, type PeerMultiple, type PePoint } from "@mystockjournal/shared";

const VIEW_W = 600;
const VIEW_H = 220;
/** Right padding leaves room for the peer labels that sit past the last year. */
const PAD = { top: 14, right: 78, bottom: 36, left: 44 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

export const PEER_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#0ea5e9", "#f43f5e", "#14b8a6"];

export type PeChartMode = "pe" | "peg";

export function PeChart({
  mode,
  history,
  expectedPe,
  expectedGrowth,
  avg5Y,
  avg10Y,
  peers,
  label,
}: {
  mode: PeChartMode;
  history: PePoint[];
  expectedPe: number;
  expectedGrowth: number;
  avg5Y: number | null;
  avg10Y: number | null;
  peers: PeerMultiple[];
  label: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    const values: (number | null)[] = mode === "pe" ? history.map((p) => p.pe) : pegSeries(history);
    const valid = values.filter((v): v is number => v != null);

    const expected = mode === "pe" ? expectedPe : expectedPe / Math.max(expectedGrowth, 0.1);
    const peerValues = peers
      .map((peer) => (mode === "pe" ? peer.pe : peer.peg))
      .filter((v): v is number => v != null);
    const references =
      mode === "pe"
        ? [avg5Y, avg10Y, expected, ...peerValues]
        : [1, 2, expected, ...peerValues];

    const ceiling = Math.max(...valid, ...references.filter((v): v is number => v != null), 1) * 1.18;
    const step = ceiling < 5 ? 1 : ceiling < 15 ? 2 : ceiling < 40 ? 5 : ceiling < 120 ? 20 : 50;

    const gridLines: number[] = [];
    for (let value = 0; value <= ceiling; value += step) gridLines.push(value);

    const xPos = (index: number) =>
      history.length < 2 ? PAD.left + PLOT_W / 2 : PAD.left + (index / (history.length - 1)) * PLOT_W;
    const yPos = (value: number) => PAD.top + PLOT_H - (value / ceiling) * PLOT_H;

    // Break the path wherever the metric is undefined, rather than interpolating across it.
    let path = "";
    let segment = "";
    values.forEach((value, index) => {
      if (value == null) {
        if (segment) path += `${segment} `;
        segment = "";
        return;
      }
      const point = `${xPos(index)} ${yPos(value)}`;
      segment += segment === "" ? `M ${point}` : ` L ${point}`;
    });
    path += segment;

    return { values, expected, ceiling, gridLines, xPos, yPos, path };
  }, [mode, history, expectedPe, expectedGrowth, avg5Y, avg10Y, peers]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || history.length < 2) return;
      const rect = svg.getBoundingClientRect();
      const svgX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
      const ratio = (svgX - PAD.left) / PLOT_W;
      const index = Math.round(ratio * (history.length - 1));
      setHoverIndex(Math.min(Math.max(index, 0), history.length - 1));
    },
    [history.length],
  );

  if (history.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center px-6 text-center">
        <p className="text-[12px] text-slate-400">
          No multiple history on file for this ticker yet, so there is nothing to compare your
          expected multiple against.
        </p>
      </div>
    );
  }

  const mainColor = mode === "pe" ? "#3b82f6" : "#8b5cf6";
  const expectedY = chart.yPos(chart.expected);
  const expectedInRange = expectedY > PAD.top && expectedY < VIEW_H - PAD.bottom;
  const suffix = mode === "pe" ? "x" : "";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full"
      role="img"
      aria-label={`${label} ${mode === "pe" ? "P/E" : "PEG"} history`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      {chart.gridLines.map((value) => {
        const y = chart.yPos(value);
        return (
          <g key={value}>
            <line
              x1={PAD.left}
              y1={y}
              x2={VIEW_W - PAD.right}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={value === 0 ? 1.5 : 1}
            />
            <text
              x={PAD.left - 6}
              y={y + 3.5}
              fontSize={8.5}
              fill="#94a3b8"
              textAnchor="end"
              fontFamily="var(--font-jetbrains), monospace"
            >
              {value}
              {suffix}
            </text>
          </g>
        );
      })}

      {history.map((point, index) => {
        if (index % 2 !== 0 && index !== history.length - 1) return null;
        return (
          <text
            key={point.year}
            x={chart.xPos(index)}
            y={VIEW_H - PAD.bottom + 14}
            fontSize={9}
            fill="#94a3b8"
            textAnchor="middle"
            fontFamily="var(--font-jetbrains), monospace"
          >
            {point.year}
          </text>
        );
      })}

      {mode === "pe" ? (
        <>
          {avg10Y != null && (
            <line
              x1={PAD.left}
              y1={chart.yPos(avg10Y)}
              x2={VIEW_W - PAD.right}
              y2={chart.yPos(avg10Y)}
              stroke="#cbd5e1"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          )}
          {avg5Y != null && (
            <line
              x1={PAD.left}
              y1={chart.yPos(avg5Y)}
              x2={VIEW_W - PAD.right}
              y2={chart.yPos(avg5Y)}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="6 3"
            />
          )}
        </>
      ) : (
        <>
          <line
            x1={PAD.left}
            y1={chart.yPos(1)}
            x2={VIEW_W - PAD.right}
            y2={chart.yPos(1)}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <line
            x1={PAD.left}
            y1={chart.yPos(2)}
            x2={VIEW_W - PAD.right}
            y2={chart.yPos(2)}
            stroke="#fbbf24"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        </>
      )}

      {expectedInRange && (
        <line
          x1={PAD.left}
          y1={expectedY}
          x2={VIEW_W - PAD.right}
          y2={expectedY}
          stroke="#10b981"
          strokeWidth={2}
        />
      )}

      {peers.map((peer, index) => {
        const value = mode === "pe" ? peer.pe : peer.peg;
        if (value == null) return null;
        const y = chart.yPos(value);
        if (y < PAD.top || y > VIEW_H - PAD.bottom) return null;
        const x = chart.xPos(history.length - 1) + 14;
        const color = PEER_COLORS[index % PEER_COLORS.length];
        return (
          <g key={peer.ticker}>
            <circle cx={x} cy={y} r={4} fill={color} />
            <text
              x={x + 7}
              y={y + 3.5}
              fontSize={8}
              fill={color}
              fontWeight="700"
              fontFamily="var(--font-sans), sans-serif"
            >
              {peer.ticker}
            </text>
          </g>
        );
      })}

      <path
        d={chart.path}
        fill="none"
        stroke={mainColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {chart.values.map((value, index) => {
        if (value == null) return null;
        const isLatest = index === history.length - 1;
        return (
          <circle
            key={history[index].year}
            cx={chart.xPos(index)}
            cy={chart.yPos(value)}
            r={isLatest ? 5 : 3}
            fill={isLatest ? mainColor : "white"}
            stroke={mainColor}
            strokeWidth={isLatest ? 0 : 1.5}
          />
        );
      })}

      {hoverIndex !== null &&
        (() => {
          const point = history[hoverIndex];
          const value = chart.values[hoverIndex];
          const x = chart.xPos(hoverIndex);
          const boxX = Math.min(x + 6, VIEW_W - PAD.right - 80);
          return (
            <g>
              <line x1={x} y1={PAD.top} x2={x} y2={VIEW_H - PAD.bottom} stroke="#e2e8f0" strokeWidth={1} />
              {value == null ? (
                <text
                  x={x}
                  y={PAD.top + 10}
                  fontSize={8}
                  fill="#94a3b8"
                  textAnchor="middle"
                  fontFamily="var(--font-sans), sans-serif"
                >
                  {point.year}: n/a
                </text>
              ) : (
                <g>
                  <circle
                    cx={x}
                    cy={chart.yPos(value)}
                    r={5}
                    fill="white"
                    stroke={mainColor}
                    strokeWidth={2}
                  />
                  <rect
                    x={boxX}
                    y={chart.yPos(value) - 22}
                    width={78}
                    height={20}
                    rx={4}
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                  <text
                    x={boxX + 8}
                    y={chart.yPos(value) - 8}
                    fontSize={9}
                    fill="#334155"
                    fontWeight="700"
                    fontFamily="var(--font-jetbrains), monospace"
                  >
                    {point.year}: {value.toFixed(1)}
                    {suffix}
                  </text>
                </g>
              )}
            </g>
          );
        })()}
    </svg>
  );
}
