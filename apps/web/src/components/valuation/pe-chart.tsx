"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PeSeriesPoint } from "@mystockjournal/shared";
import { useI18n } from "@/i18n";

const VIEW_W = 600;
const VIEW_H = 220;
const PAD = { top: 14, right: 44, bottom: 36, left: 44 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

export const PEER_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#0ea5e9", "#f43f5e", "#14b8a6"];

export type PeChartMode = "pe" | "peg" | "evebitda";
export type PeChartPeriod = "week" | "month" | "year";

/** ~6 ticks on the Y-axis so a 3000× outlier cannot paint a wall of labels. */
function niceAxisStep(ceiling: number) {
  if (!Number.isFinite(ceiling) || ceiling <= 0) return 1;
  const raw = ceiling / 6;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const err = raw / pow;
  const nice = err <= 1 ? 1 : err <= 2 ? 2 : err <= 5 ? 5 : 10;
  return nice * pow;
}

function metric(point: PeSeriesPoint, mode: PeChartMode): number | null {
  if (mode === "evebitda") return point.evEbitda ?? null;
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
  expectedEvEbitda = 0,
  expectedGrowth,
  avg5Y,
  avg10Y,
  label,
  emptyReason,
}: {
  mode: PeChartMode;
  history: PeSeriesPoint[];
  /** Peer series already aligned conceptually; matched onto subject labels. */
  peerSeries: { ticker: string; series: PeSeriesPoint[]; color?: string }[];
  expectedPe: number;
  expectedEvEbitda?: number;
  expectedGrowth: number;
  avg5Y: number | null;
  avg10Y: number | null;
  label: string;
  emptyReason?: string | null;
}) {
  const { t } = useI18n();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    const values = history.map((point) => metric(point, mode));
    const valid = values.filter((v): v is number => v != null);
    const expected =
      mode === "evebitda"
        ? expectedEvEbitda > 0
          ? expectedEvEbitda
          : null
        : expectedPe > 0
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
      mode === "peg" ? [1, 2, expected, ...peerValues] : [avg5Y, avg10Y, expected, ...peerValues];

    const finite = [...valid, ...references].filter((v): v is number => v != null && Number.isFinite(v) && v >= 0);
    const ceiling = Math.max(...finite, 1) * 1.18;
    const step = niceAxisStep(ceiling);

    const gridLines: number[] = [];
    for (let value = 0; value <= ceiling + step / 2; value += step) {
      gridLines.push(value);
      if (gridLines.length > 12) break;
    }

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
  }, [mode, history, peerSeries, expectedPe, expectedEvEbitda, expectedGrowth, avg5Y, avg10Y]);

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
        {emptyReason ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-semibold text-red-700">
            {emptyReason}
          </p>
        ) : (
          <p className="text-[12px] text-slate-400">
            {t("pe.emptyChart")}
          </p>
        )}
      </div>
    );
  }

  const mainColor = mode === "peg" ? "#8b5cf6" : mode === "evebitda" ? "#0d9488" : "#3b82f6";
  const expectedY = chart.expected != null ? chart.yPos(chart.expected) : null;
  const expectedInRange =
    expectedY != null && expectedY > PAD.top && expectedY < VIEW_H - PAD.bottom;
  const suffix = mode === "peg" ? "" : "x";
  const labelStep = history.length > 24 ? 4 : history.length > 12 ? 2 : 1;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full"
      role="img"
      aria-label={
        mode === "peg"
          ? t("pe.historyAriaPeg", { ticker: label })
          : mode === "evebitda"
            ? t("pe.historyAriaEvebitda", { ticker: label })
            : t("pe.historyAriaPe", { ticker: label })
      }
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

      {(mode === "pe" || mode === "evebitda") && avg10Y != null && (
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
      {(mode === "pe" || mode === "evebitda") && avg5Y != null && (
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

      {chart.values.map((value, index) =>
        value == null ? null : (
          <circle
            key={`pt-${history[index].label}-${index}`}
            cx={chart.xPos(index)}
            cy={chart.yPos(value)}
            r={history.length < 2 ? 5 : 3}
            fill={index === history.length - 1 ? mainColor : "white"}
            stroke={mainColor}
            strokeWidth={2}
          />
        ),
      )}

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
