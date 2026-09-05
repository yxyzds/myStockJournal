"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PeSeriesPoint } from "@mystockjournal/shared";

const VIEW_W = 600;
const VIEW_H = 220;
const PAD = { top: 14, right: 44, bottom: 36, left: 44 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

export const PEER_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#0ea5e9", "#f43f5e", "#14b8a6"];

export type PeChartMode = "pe" | "peg";
export type PeChartPeriod = "week" | "month" | "year";

function metric(point: PeSeriesPoint, mode: PeChartMode): number | null {
  if (mode === "pe") return point.pe;
  if (point.growth == null || point.growth <= 0) return null;
  return point.pe / point.growth;
}

function alignPeer(
  subject: PeSeriesPoint[],
  peer: PeSeriesPoint[],
  mode: PeChartMode,
): (number | null)[] {
  const byLabel = new Map(peer.map((point) => [point.label, point]));
  return subject.map((point) => {
    const match = byLabel.get(point.label);
    return match ? metric(match, mode) : null;
  });
}

export function PeChart({
  mode,
  history,
  peerSeries,
  expectedPe,
  expectedGrowth,
  avg5Y,
  avg10Y,
  label,
}: {
  mode: PeChartMode;
  history: PeSeriesPoint[];
  /** Peer series already aligned conceptually; matched onto subject labels. */
  peerSeries: { ticker: string; series: PeSeriesPoint[]; color?: string }[];
  expectedPe: number;
  expectedGrowth: number;
  avg5Y: number | null;
  avg10Y: number | null;
  label: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    const values = history.map((point) => metric(point, mode));
    const valid = values.filter((v): v is number => v != null);
    const expected =
      expectedPe > 0
        ? mode === "pe"
          ? expectedPe
          : expectedPe / Math.max(expectedGrowth, 0.1)
        : null;

    const peersPlotted = peerSeries.map((peer, index) => {
      const plotted = alignPeer(history, peer.series, mode);
      return {
        ticker: peer.ticker,
        plotted,
        path: "" as string,
        color: peer.color ?? PEER_COLORS[index % PEER_COLORS.length],
      };
    });

    const peerValues = peersPlotted.flatMap((peer) =>
      peer.plotted.filter((value): value is number => value != null),
    );
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

    function buildPath(seriesValues: (number | null)[]) {
      let path = "";
      let segment = "";
      seriesValues.forEach((value, index) => {
        if (value == null) {
          if (segment) path += `${segment} `;
          segment = "";
          return;
        }
        const point = `${xPos(index)} ${yPos(value)}`;
        segment += segment === "" ? `M ${point}` : ` L ${point}`;
      });
      return path + segment;
    }

    return {
      values,
      expected,
      ceiling,
      gridLines,
      xPos,
      yPos,
      path: buildPath(values),
      peersPlotted: peersPlotted.map((peer) => ({
        ...peer,
        path: buildPath(peer.plotted),
      })),
    };
  }, [mode, history, peerSeries, expectedPe, expectedGrowth, avg5Y, avg10Y]);

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
  const expectedY = chart.expected != null ? chart.yPos(chart.expected) : null;
  const expectedInRange =
    expectedY != null && expectedY > PAD.top && expectedY < VIEW_H - PAD.bottom;
  const suffix = mode === "pe" ? "x" : "";
  const labelStep = history.length > 24 ? 4 : history.length > 12 ? 2 : 1;

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
        if (index % labelStep !== 0 && index !== history.length - 1) return null;
        return (
          <text
            key={`${point.label}-${index}`}
            x={chart.xPos(index)}
            y={VIEW_H - 12}
            fontSize={8}
            fill="#94a3b8"
            textAnchor="middle"
            fontFamily="var(--font-sans), sans-serif"
          >
            {point.label}
          </text>
        );
      })}

      {mode === "pe" && avg10Y != null && (
        <line
          x1={PAD.left}
          y1={chart.yPos(avg10Y)}
          x2={VIEW_W - PAD.right}
          y2={chart.yPos(avg10Y)}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}
      {mode === "pe" && avg5Y != null && (
        <line
          x1={PAD.left}
          y1={chart.yPos(avg5Y)}
          x2={VIEW_W - PAD.right}
          y2={chart.yPos(avg5Y)}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {mode === "peg" && (
        <>
          <line
            x1={PAD.left}
            y1={chart.yPos(1)}
            x2={VIEW_W - PAD.right}
            y2={chart.yPos(1)}
            stroke="#fbbf24"
            strokeWidth={1.25}
            strokeDasharray="3 4"
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

      {chart.peersPlotted.map((peer) => (
        <path
          key={peer.ticker}
          d={peer.path}
          fill="none"
          stroke={peer.color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      ))}

      <path
        d={chart.path}
        fill="none"
        stroke={mainColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {hoverIndex !== null &&
        (() => {
          const point = history[hoverIndex];
          const x = chart.xPos(hoverIndex);
          const rows: { name: string; value: number | null; color: string }[] = [
            { name: label, value: chart.values[hoverIndex], color: mainColor },
            ...chart.peersPlotted.map((peer) => ({
              name: peer.ticker,
              value: peer.plotted[hoverIndex],
              color: peer.color,
            })),
          ];
          const rowHeight = 14;
          const boxHeight = 18 + rows.length * rowHeight;
          const boxWidth = 108;
          const boxX = Math.min(x + 8, VIEW_W - PAD.right - boxWidth);
          const boxY = Math.min(PAD.top + 4, VIEW_H - PAD.bottom - boxHeight);

          return (
            <g>
              <line x1={x} y1={PAD.top} x2={x} y2={VIEW_H - PAD.bottom} stroke="#e2e8f0" strokeWidth={1} />
              {rows.map((row) =>
                row.value == null ? null : (
                  <circle
                    key={`dot-${row.name}`}
                    cx={x}
                    cy={chart.yPos(row.value)}
                    r={4}
                    fill="white"
                    stroke={row.color}
                    strokeWidth={2}
                  />
                ),
              )}
              <rect
                x={boxX}
                y={boxY}
                width={boxWidth}
                height={boxHeight}
                rx={4}
                fill="white"
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={boxX + 8}
                y={boxY + 12}
                fontSize={8}
                fill="#94a3b8"
                fontFamily="var(--font-sans), sans-serif"
              >
                {point.label}
              </text>
              {rows.map((row, index) => (
                <g key={row.name}>
                  <circle
                    cx={boxX + 12}
                    cy={boxY + 22 + index * rowHeight}
                    r={3}
                    fill={row.color}
                  />
                  <text
                    x={boxX + 20}
                    y={boxY + 25 + index * rowHeight}
                    fontSize={9}
                    fill="#334155"
                    fontWeight="600"
                    fontFamily="var(--font-jetbrains), monospace"
                  >
                    {row.name}{" "}
                    {row.value == null ? "—" : `${row.value.toFixed(1)}${suffix}`}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}
    </svg>
  );
}
