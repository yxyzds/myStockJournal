"use client";

import { useState, type ReactNode } from "react";

export const fmtMoneyM = (v: number) => `$${Math.round(v).toLocaleString()}M`;
export const fmt1 = (v: number) => v.toFixed(1);
export const fmt2 = (v: number) => v.toFixed(2);
export const fmtPct = (v: number) => `${v.toFixed(1)}%`;
export const fmtSigned = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[14px] border border-slate-100 bg-white ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5 md:px-[22px]">
      <div>
        <p className="text-[14px] font-bold text-slate-900">{title}</p>
        {subtitle && <p className="mt-px text-[11px] text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export type NumberLimits = { min: number; max: number; step: number };

/**
 * Number input that lets a partially typed value stand while it is being edited,
 * then clamps on blur. Clamping on every keystroke makes values like "0.5"
 * impossible to type. A null draft means the prop is authoritative, so external
 * updates (a scenario switch, say) show through without an effect.
 */
export function NumberInput({
  value,
  limits,
  onCommit,
  className = "",
  ariaLabel,
}: {
  value: number;
  limits: NumberLimits;
  onCommit: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft ?? String(value)}
      step={limits.step}
      min={limits.min}
      max={limits.max}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (
          event.target.value !== "" &&
          Number.isFinite(parsed) &&
          parsed >= limits.min &&
          parsed <= limits.max
        ) {
          onCommit(parsed);
        }
      }}
      onBlur={(event) => {
        setDraft(null);
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) {
          onCommit(Math.min(limits.max, Math.max(limits.min, parsed)));
        }
      }}
      className={`bg-transparent p-0 font-mono tabular-nums outline-none ${className}`}
    />
  );
}

/**
 * An editable model driver. When the value drifts far from the prefetched
 * estimate the field turns amber — the user is overriding the reference, which
 * is allowed but worth seeing.
 */
export function DriverField({
  label,
  value,
  reference,
  suffix,
  limits,
  onChange,
}: {
  label: string;
  value: number;
  reference: number;
  suffix: string;
  limits: NumberLimits;
  onChange: (value: number) => void;
}) {
  const threshold = Math.max(Math.abs(reference * 0.12), 0.3);
  const diverges = Math.abs(value - reference) > threshold;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold tracking-[0.07em] text-slate-500 uppercase">{label}</span>
      <div
        className={`flex items-center gap-[3px] rounded-[7px] border px-2.5 py-[7px] transition-colors ${
          diverges
            ? "border-amber-300 bg-amber-50"
            : "border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 hover:border-blue-300"
        }`}
      >
        <NumberInput
          value={value}
          limits={limits}
          onCommit={onChange}
          ariaLabel={label}
          className="w-full text-[14px] font-bold text-slate-900"
        />
        <span className="shrink-0 text-[11px] text-slate-400 select-none">{suffix}</span>
      </div>
      <div className="flex h-3.5 items-center justify-between">
        <span className={`text-[10px] ${diverges ? "font-semibold text-amber-600" : "text-slate-300"}`}>
          Estimate: {reference}
          {suffix}
        </span>
        {diverges && (
          <span className="rounded-[4px] border border-amber-200 bg-amber-50 px-[5px] py-px text-[9px] font-bold text-amber-600">
            overridden
          </span>
        )}
      </div>
    </div>
  );
}

/** A prefetched figure. Read-only until the user unlocks the anchor panel. */
export function AnchorRow({
  label,
  display,
  note,
  unlocked,
  value,
  limits,
  onChange,
}: {
  label: string;
  display: string;
  note?: string;
  unlocked?: boolean;
  value?: number;
  limits?: NumberLimits;
  onChange?: (value: number) => void;
}) {
  const editable = unlocked && value != null && limits && onChange;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-[7px] last:border-0">
      <div className="min-w-0">
        <span className="text-[11px] text-slate-500">{label}</span>
        {note && <p className="text-[9px] leading-tight text-slate-400">{note}</p>}
      </div>
      {editable ? (
        <NumberInput
          value={value}
          limits={limits}
          onCommit={onChange}
          ariaLabel={label}
          className="w-[96px] rounded-[5px] border border-blue-300 bg-white px-1.5 py-[3px] text-right text-[11px] font-semibold text-slate-800"
        />
      ) : (
        <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">{display}</span>
      )}
    </div>
  );
}

/** Amber critique of a single assumption. Never a buy or sell call. */
export type Challenge = {
  field: string;
  note: string;
  bullets: string[];
  question: string;
};

export function ChallengeCard({ challenges }: { challenges: Challenge[] }) {
  return (
    <Card>
      <div className="border-b border-slate-50 px-3.5 py-3">
        <p className="text-[12px] font-bold text-slate-900">Challenge your assumptions</p>
        <p className="mt-px text-[10px] text-slate-400">Critiques inputs · never trade advice</p>
      </div>
      <div className="flex flex-col gap-[7px] px-2.5 py-2.5">
        {challenges.length === 0 ? (
          <p className="text-[11px] leading-snug text-slate-400">
            Assumptions sit within normal bounds. Challenges appear when an input diverges sharply
            from history.
          </p>
        ) : (
          challenges.map((challenge) => (
            <div
              key={challenge.field}
              className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2"
            >
              <span className="text-[10px] font-bold text-amber-700">{challenge.field}</span>
              <p className="text-[10px] text-amber-600">{challenge.note}</p>
              <ul className="flex flex-col gap-0.5">
                {challenge.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-1">
                    <span className="mt-0.5 shrink-0 text-[8px] text-amber-300">•</span>
                    <span className="text-[10px] leading-snug text-amber-800">{bullet}</span>
                  </li>
                ))}
              </ul>
              <p className="rounded-[5px] bg-amber-100 px-[7px] py-[5px] text-[10px] leading-snug text-amber-900 italic">
                “{challenge.question}”
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${className}`}
    >
      <path
        d="M3.5 5.25L7 8.75L10.5 5.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
