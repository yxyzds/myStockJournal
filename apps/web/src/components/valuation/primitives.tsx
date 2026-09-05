"use client";

import type { FilingRef } from "@mystockjournal/shared";
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
  readOnly = false,
}: {
  value: number;
  limits: NumberLimits;
  onCommit: (value: number) => void;
  className?: string;
  ariaLabel?: string;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      readOnly={readOnly}
      value={draft ?? String(value)}
      step={limits.step}
      min={limits.min}
      max={limits.max}
      onChange={(event) => {
        if (readOnly) return;
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
        if (readOnly) {
          setDraft(null);
          return;
        }
        setDraft(null);
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) {
          onCommit(Math.min(limits.max, Math.max(limits.min, parsed)));
        }
      }}
      className={`bg-transparent p-0 font-mono tabular-nums outline-none ${
        readOnly ? "cursor-default text-slate-700" : ""
      } ${className}`}
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
  hint,
  value,
  reference,
  suffix,
  limits,
  onChange,
  readOnly = false,
}: {
  label: string;
  /** Shown when the user opens the ? affordance. */
  hint?: string;
  value: number;
  reference: number;
  suffix: string;
  limits: NumberLimits;
  onChange: (value: number) => void;
  /** Filing-derived drivers stay locked — same idea as AnchorRow. */
  readOnly?: boolean;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const threshold = Math.max(Math.abs(reference * 0.12), 0.3);
  const diverges = !readOnly && Math.abs(value - reference) > threshold;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold tracking-[0.07em] text-slate-500 uppercase">{label}</span>
        {hint ? (
          <FieldHint
            text={hint}
            open={hintOpen}
            onToggle={() => setHintOpen((open) => !open)}
          />
        ) : null}
      </div>
      {hint && hintOpen ? (
        <p className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] leading-snug font-normal tracking-normal text-slate-600 normal-case">
          {hint}
        </p>
      ) : null}
      <div
        className={`flex items-center gap-[3px] rounded-[7px] border px-2.5 py-[7px] transition-colors ${
          readOnly
            ? "border-slate-100 bg-slate-50"
            : diverges
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 hover:border-blue-300"
        }`}
      >
        <NumberInput
          value={value}
          limits={limits}
          onCommit={onChange}
          ariaLabel={label}
          readOnly={readOnly}
          className="w-full text-[14px] font-bold text-slate-900"
        />
        <span className="shrink-0 text-[11px] text-slate-400 select-none">{suffix}</span>
      </div>
      <div className="flex h-3.5 items-center justify-between">
        <span
          className={`text-[10px] ${
            readOnly
              ? "text-slate-400"
              : diverges
                ? "font-semibold text-amber-600"
                : "text-slate-300"
          }`}
        >
          {readOnly ? `From filings · ${reference}${suffix}` : `Estimate: ${reference}${suffix}`}
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

/** Compact ? control. Pass `onToggle` to manage open state in the parent (inline copy). */
export function FieldHint({
  text,
  open,
  onToggle,
}: {
  text: string;
  open?: boolean;
  onToggle?: () => void;
}) {
  const isOpen = open ?? false;
  const toggle = onToggle ?? (() => undefined);

  return (
    <button
      type="button"
      aria-label="What this field means"
      aria-expanded={isOpen}
      aria-description={text}
      onClick={toggle}
      className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
        isOpen
          ? "border-blue-400 bg-blue-50 text-blue-600"
          : "border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
      }`}
    >
      ?
    </button>
  );
}

/**
 * A figure read out of a filing. Read-only by design — these are reported facts,
 * not judgments. `editable` is only set when no filing covered the ticker, which
 * is the one case where the user has to supply the numbers.
 */
export function AnchorRow({
  label,
  display,
  note,
  editable: allowEdit,
  value,
  limits,
  onChange,
}: {
  label: string;
  display: string;
  note?: string;
  editable?: boolean;
  value?: number;
  limits?: NumberLimits;
  onChange?: (value: number) => void;
}) {
  const editable = allowEdit && value != null && limits && onChange;

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

/**
 * Where the anchor figures came from, with links to the filings themselves so
 * the user can check any number against the source. Degrades to a plain note
 * when the anchors came from the bundled dataset and have no filing behind them.
 */
export function FilingSourceNote({
  period,
  filings,
}: {
  period: string | null;
  filings: FilingRef[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] leading-snug text-slate-400">
        Read from SEC filings — not editable{period ? ` · ${period}` : ""}
      </p>
      {filings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filings.map((filing) => (
            <a
              key={filing.url}
              href={filing.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${filing.form} for the period ending ${filing.reportDate || "unknown"}`}
              className="flex items-center gap-1 rounded-[5px] border border-slate-200 bg-white px-1.5 py-[3px] text-[9px] font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600"
            >
              <span>{filing.form}</span>
              <span className="font-mono text-slate-400">{filing.filingDate}</span>
              <ExternalLinkIcon />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden className="shrink-0">
      <path
        d="M3.5 1.5h5v5M8.5 1.5L4 6M6.5 8.5h-5v-5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
