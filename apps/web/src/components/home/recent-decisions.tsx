"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { DecisionType, RecentDecision, TradeReviewGrade } from "@mystockjournal/shared";
import { api } from "@/lib/api";

const ACTION_META: Record<DecisionType, { label: string; color: "green" | "blue" | "amber" | "red" }> = {
  buy: { label: "BUY", color: "green" },
  sell: { label: "SELL", color: "red" },
  thesis_update: { label: "THESIS UPDATE", color: "blue" },
  fair_value: { label: "FAIR VALUE", color: "blue" },
};

function sharesLabel(qty: number | null, type: DecisionType) {
  if ((type !== "buy" && type !== "sell") || qty == null) return null;
  return `${qty} shares`;
}

function dateLabel(isoDate: string) {
  const date = isoDate.length === 10 ? new Date(`${isoDate}T12:00:00`) : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActionChip({ type }: { type: DecisionType }) {
  const meta = ACTION_META[type];
  const styles: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-[7px] py-[3px] font-mono text-[10px] font-semibold tracking-wide uppercase ${styles[meta.color]}`}
    >
      {meta.label}
    </span>
  );
}

function GradeControl({ grade }: { grade: TradeReviewGrade | null }) {
  if (!grade) {
    return (
      <span className="rounded-[6px] border border-blue-200 px-[10px] py-[5px] text-[12px] font-medium whitespace-nowrap text-blue-600 md:px-3 md:py-1.5">
        Rate →
      </span>
    );
  }
  return (
    <span className="font-mono text-[13px] font-bold tracking-wide text-blue-700 md:text-[15px]">
      {grade}
    </span>
  );
}

function DecisionRowDesktop({ d }: { d: RecentDecision }) {
  const shares = sharesLabel(d.qty, d.type);
  return (
    <Link href={`/stock/${d.ticker}`} className="-mx-4 block rounded-lg px-4 transition-colors hover:bg-slate-50">
      <div className="group flex items-center justify-between py-5">
        <div className="flex min-w-0 flex-1 items-start gap-5">
          <span className="w-11 shrink-0 pt-0.5 text-[12px] font-medium whitespace-nowrap text-slate-400">
            {dateLabel(d.date)}
          </span>
          <div className="shrink-0 pt-px">
            <ActionChip type={d.type} />
          </div>
          <span className="w-11 shrink-0 pt-px font-mono text-[14px] font-bold text-slate-900">{d.ticker}</span>
          {shares && (
            <span className="shrink-0 pt-px font-mono text-[13px] font-semibold tabular-nums text-slate-700">
              {shares}
            </span>
          )}
          <p className="truncate text-[14px] leading-snug text-slate-600 transition-colors group-hover:text-slate-800">
            {d.rationale}
          </p>
        </div>
        <div className="ml-8 shrink-0">
          <GradeControl grade={d.grade} />
        </div>
      </div>
    </Link>
  );
}

function DecisionCardMobile({ d }: { d: RecentDecision }) {
  const shares = sharesLabel(d.qty, d.type);
  return (
    <Link href={`/stock/${d.ticker}`} className="block">
      <div className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-100 bg-white px-3.5 py-3 active:bg-slate-50">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ActionChip type={d.type} />
            <span className="font-mono text-[13px] font-bold text-slate-900">{d.ticker}</span>
            {shares && (
              <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">
                {shares}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-slate-400">{dateLabel(d.date)}</span>
          </div>
          <p className="line-clamp-2 text-[13px] leading-snug text-slate-600">{d.rationale}</p>
        </div>
        <div className="flex shrink-0 items-center pl-1.5">
          <GradeControl grade={d.grade} />
        </div>
      </div>
    </Link>
  );
}

export function RecentDecisions() {
  const query = useQuery({
    queryKey: ["decisions", "recent"],
    queryFn: () => api<{ items: RecentDecision[] }>("/decisions/recent"),
  });
  const items = query.data?.items ?? [];

  return (
    <section className="w-full py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">Recent Decisions</h2>
        </div>
        {items.length === 0 ? (
          <p className="mt-4 text-[13px] text-slate-400">
            Record a trade, journal note, or fair value — the latest three show up here.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-2 md:hidden">
              {items.map((d) => (
                <DecisionCardMobile key={d.id} d={d} />
              ))}
            </div>
            <div className="mt-1 hidden divide-y divide-slate-100 md:block">
              {items.map((d) => (
                <DecisionRowDesktop key={d.id} d={d} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
